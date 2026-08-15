/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Pure utility functions for the LLM-based Spanish translation PoC.
 * Used by scripts/generate_discover_es_translation.mjs and tested here.
 */

export interface ExistingTranslations {
  locale?: string;
  formats?: Record<string, unknown>;
  messages: Record<string, string>;
}

export interface DeltaResult {
  /** Keys that need to be (re)translated: new or whose English source changed. */
  delta: Record<string, string>;
  /** Keys present in es.json that no longer exist in source — should be removed. */
  removed: string[];
}

/**
 * Computes which strings need action on the next translation run.
 *
 * @param sourceMessages   Current defaultMessage values extracted from source
 * @param existing         The committed es.json content
 * @param fingerprints     Map of key → English text that was used for the last translation
 */
export function computeDelta(
  sourceMessages: Record<string, string>,
  existing: ExistingTranslations,
  fingerprints: Record<string, string>
): DeltaResult {
  const existingMessages = existing.messages ?? {};
  const delta: Record<string, string> = {};
  const removed: string[] = [];

  for (const [key, englishText] of Object.entries(sourceMessages)) {
    const alreadyTranslated = key in existingMessages;
    const sourceChanged = fingerprints[key] !== englishText;

    if (!alreadyTranslated || sourceChanged) {
      delta[key] = englishText;
    }
  }

  for (const key of Object.keys(existingMessages)) {
    if (!(key in sourceMessages)) {
      removed.push(key);
    }
  }

  return { delta, removed };
}

/**
 * Extracts all ICU placeholder names from an ICU message string.
 * e.g. "Hello {name}, you have {count} items" → ["name", "count"]
 */
export function extractIcuPlaceholders(text: string): string[] {
  const placeholders: string[] = [];
  // Match the outermost {identifier} or {identifier, type, ...} patterns
  const regex = /\{(\w+)(?:[^{}]|\{[^{}]*\})*\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    placeholders.push(match[1]);
  }
  return placeholders;
}

/**
 * Validates that a translated string preserves all ICU placeholders from the source.
 * Returns the names of any placeholders that are missing from the translation.
 */
export function findMissingPlaceholders(source: string, translation: string): string[] {
  const sourcePlaceholders = extractIcuPlaceholders(source);
  const translationPlaceholders = new Set(extractIcuPlaceholders(translation));
  return sourcePlaceholders.filter((p) => !translationPlaceholders.has(p));
}

/**
 * Extracts i18n.translate() calls from TypeScript/TSX source content.
 * Returns a map of key → defaultMessage.
 *
 * Handles single and double quoted defaultMessage values.
 * Template literals are not supported (rare in practice for defaultMessage).
 */
export function extractMessagesFromContent(content: string): Record<string, string> {
  const messages: Record<string, string> = {};

  const patterns = [
    /i18n\.translate\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*?defaultMessage\s*:\s*'((?:[^'\\]|\\.)*)'/gs,
    /i18n\.translate\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*?defaultMessage\s*:\s*"((?:[^"\\]|\\.)*)"/gs,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      const value = match[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (!messages[key]) messages[key] = value;
    }
  }

  return messages;
}
