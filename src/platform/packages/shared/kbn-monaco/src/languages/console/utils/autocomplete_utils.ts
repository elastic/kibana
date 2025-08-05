/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This function takes a Console text up to the current position and determines whether
 * the current position is inside triple quotes, triple-quote or single-quote query,
 * and the start index of the current query.
 * @param text The text up to the current position
 */
export const checkForTripleQuotesAndQueries = (
  text: string
): {
  insideTripleQuotes: boolean;
  insideSingleQuotesQuery: boolean;
  insideTripleQuotesQuery: boolean;
  queryIndex: number;
} => {
  let insideSingleQuotes = false;
  let insideTripleQuotes = false;

  let insideSingleQuotesQuery = false;
  let insideTripleQuotesQuery = false;

  let currentQueryStartIndex = -1;
  let i = 0;

  while (i < text.length) {
    if (text.startsWith('"""', i)) {
      insideTripleQuotes = !insideTripleQuotes;
      if (insideTripleQuotes) {
        insideTripleQuotesQuery = /.*"query"\s*:\s*$/.test(text.slice(0, i));
        if (insideTripleQuotesQuery) {
          currentQueryStartIndex = i + 3;
        }
      } else {
        insideTripleQuotesQuery = false;
        currentQueryStartIndex = -1;
      }
      i += 3; // Skip the triple quotes
    } else if (text.at(i) === '"' && text.at(i - 1) !== '\\') {
      insideSingleQuotes = !insideSingleQuotes;
      if (insideSingleQuotes) {
        insideSingleQuotesQuery = /.*"query"\s*:\s*$/.test(text.slice(0, i));
        if (insideSingleQuotesQuery) {
          currentQueryStartIndex = i + 1;
        }
      } else {
        insideSingleQuotesQuery = false;
        currentQueryStartIndex = -1;
      }
      i++;
    } else {
      i++;
    }
  }

  return {
    insideTripleQuotes,
    insideSingleQuotesQuery,
    insideTripleQuotesQuery,
    queryIndex: currentQueryStartIndex,
  };
};

/**
 * This function unescapes chars that are invalid in a Console string.
 */
export const unescapeInvalidChars = (str: string): string => {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
};
