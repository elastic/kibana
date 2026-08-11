/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';
import { collapseTripleQuoteStrings } from './triple_quotes';
import { containsCommentToken, replaceCommentTokens } from './tokens';

export const containsComments = (requestData: string): boolean => {
  return containsCommentToken(requestData);
};

const removeCommentsFromDataWithTripleQuotes = (dataString: string): string | null => {
  const dataWithoutComments = replaceCommentTokens(dataString);
  const { collapsedTripleQuotesData } = collapseTripleQuoteStrings(dataWithoutComments);

  try {
    parse(collapsedTripleQuotesData);
    return dataWithoutComments;
  } catch {
    return null;
  }
};

/**
 * This function removes comments from the request data.
 *
 * The comment removal is done by parsing the data with hjson and stringifying the result.
 * Since hjson can't parse multi-line strings in triple quotes, a token-aware fallback removes
 * comments outside quoted strings and validates the result after collapsing triple-quote strings.
 * Comments inside triple-quote strings (e.g. Painless comments) are preserved.
 * If the data can't be parsed at all, it is returned unchanged.
 */
export const removeCommentsFromData = (dataString: string): string => {
  try {
    return JSON.stringify(parse(dataString), null, 2);
  } catch {
    if (!dataString.includes('"""')) {
      return dataString;
    }
    return removeCommentsFromDataWithTripleQuotes(dataString) ?? dataString;
  }
};
