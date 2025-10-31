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
export const checkForTripleQuotesAndEsqlQuery = (
  text: string
): {
  insideTripleQuotes: boolean;
  insideEsqlQuery: boolean;
  esqlQueryIndex: number;
} => {
  let insideSingleQuotes = false;
  let insideTripleQuotes = false;

  let insideSingleQuotesQuery = false;
  let insideTripleQuotesQuery = false;

  let insideEsqlQueryRequest = false;

  let currentQueryStartIndex = -1;
  let i = 0;

  while (i < text.length) {
    const textBefore = text.slice(0, i);
    const textFromIndex = text.slice(i);
    if (text.startsWith('"""', i)) {
      insideTripleQuotes = !insideTripleQuotes;
      if (insideTripleQuotes) {
        insideTripleQuotesQuery = /.*"query"\s*:\s*$/.test(textBefore);
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
        insideSingleQuotesQuery = /.*"query"\s*:\s*$/.test(textBefore);
        if (insideSingleQuotesQuery) {
          currentQueryStartIndex = i + 1;
        }
      } else {
        insideSingleQuotesQuery = false;
        currentQueryStartIndex = -1;
      }
      i++;
    } else if (/^(GET|POST|PUT|DELETE|HEAD|PATCH)/i.test(textFromIndex)) {
      // If this is the start of a new request, check if it is a _query API request
      insideEsqlQueryRequest = /^(P|p)(O|o)(S|s)(T|t)\s+\/?_query(\/async)?(\n|\s|\?)/.test(
        textFromIndex
      );
      // Move the index past the current line that contains request method and endpoint.
      const newlineIndex = text.indexOf('\n', i);
      if (newlineIndex === -1) {
        // No newline after the request line; advance to end to avoid infinite loop.
        i = text.length;
      } else {
        i = newlineIndex + 1; // Position at start of next line
      }
    } else {
      i++;
    }
  }

  return {
    insideTripleQuotes,
    insideEsqlQuery: insideEsqlQueryRequest && (insideSingleQuotesQuery || insideTripleQuotesQuery),
    esqlQueryIndex: insideEsqlQueryRequest ? currentQueryStartIndex : -1,
  };
};

/**
 * This function unescapes chars that are invalid in a Console string.
 */
export const unescapeInvalidChars = (str: string): string => {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
};
