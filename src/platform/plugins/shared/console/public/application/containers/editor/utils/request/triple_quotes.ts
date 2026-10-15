/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  decodeStringToken,
  getRequestDataScannerTokens,
  getRequestDataTokens,
  isStringToken,
  replaceRequestDataTokens,
  type RequestDataToken,
} from './tokens';

export const TRIPLE_QUOTE_STRINGS_MARKER = '"{tripleQuoteString}"';

export interface CollapsedTripleQuoteStrings {
  readonly collapsedTripleQuotesData: string;
  readonly tripleQuoteStrings: string[];
  readonly marker: string;
}

const doesTripleQuoteMarkerCollide = (data: string, marker: string): boolean => {
  if (data.includes(marker)) {
    return true;
  }

  const decodedMarker = marker.slice(1, -1);
  return getRequestDataTokens(data).some(
    (token) =>
      token.kind !== 'tripleQuotedString' &&
      isStringToken(token) &&
      decodeStringToken(token.value) === decodedMarker
  );
};

const createCollisionSafeTripleQuoteMarker = (data: string): string => {
  for (let index = -1; ; index += 1) {
    const marker = index === -1 ? TRIPLE_QUOTE_STRINGS_MARKER : `"{tripleQuoteString_${index}}"`;

    if (!doesTripleQuoteMarkerCollide(data, marker)) {
      return marker;
    }
  }
};

const isClosedTripleQuoteString = (token: RequestDataToken): boolean => {
  return (
    token.kind === 'tripleQuotedString' && token.value.length > 3 && token.value.endsWith('"""')
  );
};

/**
 * Replaces triple-quote strings with a collision-safe marker, ignoring markers inside comments.
 */
export const collapseTripleQuoteStrings = (data: string): CollapsedTripleQuoteStrings => {
  const marker = createCollisionSafeTripleQuoteMarker(data);
  const tokens = getRequestDataScannerTokens(data);
  const tripleQuoteStrings = tokens.filter(isClosedTripleQuoteString).map(({ value }) => value);

  return {
    collapsedTripleQuotesData: replaceRequestDataTokens(data, tokens, (token) =>
      isClosedTripleQuoteString(token) ? marker : token.value
    ),
    tripleQuoteStrings,
    marker,
  };
};

/**
 * Replaces collapsed triple-quote markers with the original triple-quote strings.
 */
export const expandTripleQuoteStrings = (
  data: string,
  tripleQuoteStrings: string[],
  marker: string = TRIPLE_QUOTE_STRINGS_MARKER
): string => {
  return data
    .split(marker)
    .flatMap((part, index) =>
      index < tripleQuoteStrings.length ? [part, tripleQuoteStrings[index]] : [part]
    )
    .join('');
};
