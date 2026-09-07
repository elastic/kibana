/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MAX_INPUT_LENGTH = 100000; // max 100,000 characters per string
export const MAX_PATTERN_LENGTH = 10000; // max 10,000 characters for regex patterns
export const MAX_ARRAY_LENGTH = 10000; // max 10,000 items in array

/**
 * Validates that an input string does not exceed the maximum allowed length.
 * This helps prevent ReDoS attacks by limiting the size of input that can be
 * processed by regular expressions.
 */
export function validateInputLength(
  item: string,
  logger: { warn: (message: string) => void }
): { valid: true } | { valid: false; error: Error } {
  if (item.length > MAX_INPUT_LENGTH) {
    logger.warn(`Input string exceeds max length (${item.length} > ${MAX_INPUT_LENGTH})`);
    return {
      valid: false,
      error: new Error(
        `Input string exceeds maximum allowed length of ${MAX_INPUT_LENGTH} characters to prevent ReDoS attacks. Current length: ${item.length}`
      ),
    };
  }
  return { valid: true };
}

/**
 * Detects potentially dangerous ReDoS (Regular Expression Denial of Service) patterns.
 * Checks for common vulnerable patterns that can cause catastrophic backtracking.
 *
 * @param pattern - The regex pattern to validate
 * @returns Error if a dangerous pattern is detected, undefined otherwise
 */
export function detectRedosPatterns(pattern: string): Error | undefined {
  // Check for nested quantifiers with end anchor FIRST: (a+)+$
  // This is especially dangerous and needs specific error message
  const nestedQuantifiersWithAnchor = /\([^)]*[*+?{]\s*\)[*+?{]\$$/;
  if (nestedQuantifiersWithAnchor.test(pattern)) {
    return new Error(
      'Potentially dangerous regex pattern detected: nested quantifiers with end anchor like (a+)+$ can cause catastrophic backtracking (ReDoS vulnerability)'
    );
  }

  // Nested quantifiers: (a+)+, (a*)*, (a?)+, etc.
  // Match patterns where there's a quantifier just before the closing paren, followed by another quantifier
  // This catches (a+)+ but not (abc)+ or (?:foo|bar)+
  const nestedQuantifiers = /\([^)]*[*+?{]\s*\)[*+?{]/;
  if (nestedQuantifiers.test(pattern)) {
    return new Error(
      'Potentially dangerous regex pattern detected: nested quantifiers like (a+)+ can cause catastrophic backtracking (ReDoS vulnerability)'
    );
  }

  // Overlapping alternations with quantifiers: (a|aa)+, (a|ab|abc)*, etc.
  // Only flag patterns where one alternative is a prefix of another
  const overlappingAlternations = /\([^)]*\|[^)]*\)[*+]/;
  if (overlappingAlternations.test(pattern)) {
    // Extract the alternation group content
    const match = pattern.match(/\(([^)]*\|[^)]*)\)[*+]/);
    if (match) {
      const alternatives = match[1].split('|').map((alt) => alt.trim());
      // Check if any alternative is a prefix of another
      for (let i = 0; i < alternatives.length; i++) {
        for (let j = 0; j < alternatives.length; j++) {
          if (i !== j && alternatives[j].startsWith(alternatives[i])) {
            return new Error(
              'Potentially dangerous regex pattern detected: overlapping alternations with quantifiers like (a|aa)+ can cause catastrophic backtracking (ReDoS vulnerability)'
            );
          }
        }
      }
    }
  }

  // Multiple consecutive quantifiers on the same group
  const multipleQuantifiers = /[*+?]\{|\}\{|[*+?][*+?]/;
  if (multipleQuantifiers.test(pattern)) {
    return new Error(
      'Potentially dangerous regex pattern detected: multiple consecutive quantifiers can cause catastrophic backtracking (ReDoS vulnerability)'
    );
  }

  return undefined;
}

/**
 * Creates a RegExp object from a pattern string and optional flags.
 * Validates the pattern length and ReDoS vulnerabilities before creating the regex.
 *
 * @param pattern - The regex pattern string
 * @param flags - Optional regex flags (g, i, m, etc.)
 * @param logger - Logger for error messages
 * @returns Object containing either the created RegExp or an Error
 */
export function createRegex(
  pattern: string,
  flags: string | undefined,
  logger: { error: (message: string, error?: unknown) => void; warn?: (message: string) => void }
): { regex: RegExp } | { error: Error } {
  // Check pattern length first
  if (pattern.length > MAX_PATTERN_LENGTH) {
    const error = new Error(
      `Pattern exceeds maximum allowed length of ${MAX_PATTERN_LENGTH} characters. Current length: ${pattern.length}`
    );
    logger.error('Pattern length limit exceeded', error);
    return { error };
  }

  // Check for ReDoS patterns
  const redosError = detectRedosPatterns(pattern);
  if (redosError) {
    if (logger.warn) {
      logger.warn(`ReDoS pattern detected in regex: ${pattern}`);
    }
    logger.error('Dangerous regex pattern rejected', redosError);
    return { error: redosError };
  }

  try {
    return { regex: new RegExp(pattern, flags) };
  } catch (err) {
    logger.error('Invalid regex pattern', err);
    return {
      error: new Error(
        `Invalid regex pattern: ${pattern}. ${err instanceof Error ? err.message : 'Unknown error'}`
      ),
    };
  }
}

/**
 * Validates that the source input is either a string or an array of appropriate size.
 * Prevents processing of excessively large arrays that could cause performance issues.
 */
export function validateSourceInput(
  source: unknown,
  logger: { error: (message: string) => void; warn?: (message: string) => void }
): { valid: true; isArray: boolean } | { valid: false; error: Error } {
  if (source == null) {
    logger.error('Input source is null or undefined');
    return {
      valid: false,
      error: new Error(
        'Source cannot be null or undefined. Please provide a string or array of strings.'
      ),
    };
  }

  const isArray = Array.isArray(source);
  if (!isArray && typeof source !== 'string') {
    logger.error(`Input source has invalid type: ${typeof source}`);
    return {
      valid: false,
      error: new Error(
        `Expected source to be a string or array, but received ${typeof source}. Please provide a string or array of strings.`
      ),
    };
  }

  if (isArray && source.length > MAX_ARRAY_LENGTH) {
    if (logger.warn) {
      logger.warn(`Input array exceeds max length (${source.length} > ${MAX_ARRAY_LENGTH})`);
    }
    logger.error('Input array exceeds maximum allowed length');
    return {
      valid: false,
      error: new Error(
        `Input array exceeds maximum allowed length of ${MAX_ARRAY_LENGTH} items to prevent performance issues. Current length: ${source.length}`
      ),
    };
  }

  return { valid: true, isArray };
}
