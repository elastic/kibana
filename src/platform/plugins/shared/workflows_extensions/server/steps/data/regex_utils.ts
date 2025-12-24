/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MAX_INPUT_LENGTH = 100000; // 100KB per string

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

export function createRegex(
  pattern: string,
  flags: string | undefined,
  logger: { error: (message: string, error?: unknown) => void }
): { regex: RegExp } | { error: Error } {
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

export function validateSourceInput(
  source: unknown,
  logger: { error: (message: string) => void }
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

  return { valid: true, isArray };
}
