/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ExtractedKey {
  key: string;
  type: string;
}

/**
 * Pull the first top-level keys and their type hints out of a Zod object-literal
 * dump like `{ a: string; b: { nested: number }; c: Array<string> }`. The dump
 * may be followed by a ` // description` suffix which is stripped by finding
 * the matching closing brace rather than requiring the string to end on `}`.
 * Bracket depth is tracked so a nested `{...}` or `Array<...>` counts as a
 * single type value and doesn't split on its internal `;` / `,`.
 */
export const extractTopLevelKeys = (type: string): ExtractedKey[] => {
  const trimmed = type.trim();
  const openIdx = trimmed.indexOf('{');
  if (openIdx === -1) return [];

  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) return [];

  const body = trimmed.slice(openIdx + 1, closeIdx);
  const entries: ExtractedKey[] = [];
  const pushEntry = (raw: string) => {
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) return;
    const key = raw.slice(0, colonIdx).trim().replace(/\?$/, '');
    const typeStr = raw.slice(colonIdx + 1).trim();
    if (key) entries.push({ key, type: typeStr });
  };
  let bodyDepth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{' || ch === '<' || ch === '[' || ch === '(') bodyDepth++;
    else if (ch === '}' || ch === '>' || ch === ']' || ch === ')') bodyDepth--;
    else if (bodyDepth === 0 && (ch === ';' || ch === ',')) {
      pushEntry(body.slice(start, i));
      start = i + 1;
    }
  }
  pushEntry(body.slice(start));
  return entries;
};

/**
 * Render a single key's type as a compact hint: `string`, `array`, `object`,
 * or the first word of a longer form (e.g. `Record<string, unknown>` → `Record`).
 */
export const summarizeKeyType = (type: string): string => {
  const t = type.trim();
  if (!t) return '';
  if (t.endsWith('[]') || t.startsWith('Array<')) return 'array';
  if (t.startsWith('{') || t.startsWith('Record<')) return 'object';
  if (t.length <= 20) return t;
  const firstWord = t.split(/[<\s|]/)[0];
  return firstWord || 'mixed';
};

/**
 * Collapse long Zod dumps into a short human-readable label for the TYPE pill.
 * The full Zod rendering adds no signal beyond "this is an object/array/etc."
 * and drowns the details panel; users who need the exact shape can check the
 * schema or hover the variable.
 */
export const compactTypeLabel = (type: string): string => {
  const trimmed = type.trim();
  if (trimmed.length === 0) return trimmed;
  if (trimmed.length <= 48 && !trimmed.includes('\n')) return trimmed;

  if (trimmed.endsWith('[]') || trimmed.startsWith('Array<')) return 'array';
  if (trimmed.startsWith('{') || trimmed.startsWith('Record<')) return 'object';
  if (trimmed.includes(' | ')) {
    const parts = trimmed
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length <= 3 && parts.every((p) => p.length < 20)) return parts.join(' | ');
    return 'mixed';
  }
  return `${trimmed.slice(0, 45)}…`;
};
