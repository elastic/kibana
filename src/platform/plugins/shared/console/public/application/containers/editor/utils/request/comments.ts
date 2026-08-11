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
import { getRequestDataTokens, isCommentToken, replaceRequestDataTokens } from './tokens';

export const containsComments = (requestData: string): boolean => {
  return getRequestDataTokens(requestData).some(isCommentToken);
};

const removeCommentsFromDataWithTripleQuotes = (dataString: string): string | null => {
  const dataWithoutComments = replaceRequestDataTokens(
    dataString,
    getRequestDataTokens(dataString),
    (token) => (isCommentToken(token) ? ' ' : token.value)
  );
  const { collapsedTripleQuotesData } = collapseTripleQuoteStrings(dataWithoutComments);

  try {
    parse(collapsedTripleQuotesData);
    return dataWithoutComments;
  } catch {
    return null;
  }
};

/**
 * Removes comments outside triple-quoted strings, or returns the original data when it is invalid.
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
