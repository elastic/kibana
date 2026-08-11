/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const TRIPLE_QUOTE_STRINGS_MARKER = '"{tripleQuoteString}"';

/**
 * This function replaces all triple-quote strings with {@link TRIPLE_QUOTE_STRINGS_MARKER}
 */
export function collapseTripleQuoteStrings(data: string) {
  const splitData = data.split(`"""`);
  const tripleQuoteStrings = [];
  for (let i = 1; i < splitData.length - 1; i += 2) {
    tripleQuoteStrings.push('"""' + splitData[i] + '"""');
    splitData[i] = TRIPLE_QUOTE_STRINGS_MARKER;
  }
  return { collapsedTripleQuotesData: splitData.join(''), tripleQuoteStrings };
}

/**
 * This function replaces all {@link TRIPLE_QUOTE_STRINGS_MARKER}s in the provided text with the corresponding provided triple-quote strings.
 */
export function expandTripleQuoteStrings(data: string, tripleQuoteStrings: string[]) {
  const splitData = data.split(TRIPLE_QUOTE_STRINGS_MARKER);
  const allData = [];
  for (let i = 0; i < splitData.length; i++) {
    allData.push(splitData[i]);
    if (i < tripleQuoteStrings.length) {
      allData.push(tripleQuoteStrings[i]);
    }
  }
  return allData.join('');
}
