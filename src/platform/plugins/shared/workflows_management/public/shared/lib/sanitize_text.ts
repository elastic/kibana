/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sanitizes text input (yaml, json, text...) from the Monaco editor to remove invisible or
 * non-standard Unicode characters that cause parser failures.
 *
 * Primary trigger: French (AZERTY) keyboards inject non-breaking spaces
 * (U+00A0) instead of regular spaces, which are visually identical but
 * treated as non-whitespace by text parsers.
 *
 * Also normalizes other common copy-paste artifacts (smart quotes,
 * zero-width characters, Windows line endings) that can silently break
 * text or template parsing.
 */
export const sanitizeText = (input: string): string => {
  return (
    input
      // Normalize line endings
      .replace(/\r\n?/g, '\n')
      // Replace non-breaking and Unicode whitespace with regular space
      .replace(/[\u00A0\u2002\u2003\u2009]/g, ' ')
      // Remove zero-width characters and BOM
      .replace(/[\u200B\uFEFF]/g, '')
      // Replace smart quotes with ASCII equivalents
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
  );
};
