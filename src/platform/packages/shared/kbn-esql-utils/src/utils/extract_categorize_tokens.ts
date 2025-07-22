/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Extracts "tokens" from a regex string (produced by the categorize function) by stripping leading/trailing '.*?'
 * and splitting the remainder by '.+?'.
 *
 * @param {string} regexString The regular expression string.
 * @returns {string[]} An array of extracted "keywords".
 */
export function extractCategorizeTokens(regexString: string) {
  let cleanedString = regexString;

  // Remove backslashes
  cleanedString = cleanedString.replace(/\\/g, '');

  // Strip leading '.*?'
  if (cleanedString.startsWith('.*?')) {
    cleanedString = cleanedString.substring('.*?'.length);
  }

  // Strip trailing '.*?'
  if (cleanedString.endsWith('.*?')) {
    cleanedString = cleanedString.substring(0, cleanedString.length - '.*?'.length);
  }

  // Split by '.+?'
  // Escape the '.' so it's treated as a literal dot, not a wildcard
  // '.+?' as a literal string to split by.
  const keywords = cleanedString.split(/\.\+\?/);
  return keywords.map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 0);
}
