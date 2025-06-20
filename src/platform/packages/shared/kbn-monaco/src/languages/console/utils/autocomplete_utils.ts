/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This function determines whether the given text ends with unclosed triple quotes
 * and whether it ends with an unclosed triple-quotes query ("query": """...)
 * @param text The text up to the current position
 */
export const isInsideTripleQuotes = (
  text: string
): { insideTripleQuotes: boolean; insideQuery: boolean } => {
  let insideTripleQuotes = false;
  let isCurrentTripleQuoteQuery = false;
  let i = 0;

  while (i < text.length) {
    if (text.startsWith('"""', i)) {
      insideTripleQuotes = !insideTripleQuotes;
      if (insideTripleQuotes) {
        isCurrentTripleQuoteQuery = /.*"query"\s*:\s*/.test(text.slice(0, i));
      }
      i += 3; // Skip the triple quotes
    } else {
      i++;
    }
  }

  return { insideTripleQuotes, insideQuery: insideTripleQuotes && isCurrentTripleQuoteQuery };
};
