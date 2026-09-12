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
import {
  getRequestDataScannerTokens,
  getRequestDataTokens,
  isCommentToken,
  replaceRequestDataTokens,
  type RequestDataToken,
} from './tokens';

export const containsComments = (requestData: string): boolean => {
  return getRequestDataScannerTokens(requestData).some(isCommentToken);
};

const isUnclosedBlockComment = (token: RequestDataToken): boolean => {
  return token.kind === 'blockComment' && !token.value.endsWith('*/');
};

const replaceCommentToken = (token: RequestDataToken): string => {
  if (!isCommentToken(token)) {
    return token.value;
  }

  const lineEnding = token.kind === 'lineComment' ? token.value.match(/\r?\n$/)?.[0] ?? '' : '';
  return ` ${lineEnding}`;
};

const removeCommentsFromDataWithTokens = (
  dataString: string,
  tokens: RequestDataToken[]
): string => {
  return replaceRequestDataTokens(dataString, tokens, replaceCommentToken);
};

const removeCommentsFromDataWithTripleQuotes = (
  dataString: string,
  tokens = getRequestDataTokens(dataString)
): string | null => {
  const dataWithoutComments = removeCommentsFromDataWithTokens(dataString, tokens);
  const { collapsedTripleQuotesData } = collapseTripleQuoteStrings(dataWithoutComments);

  try {
    parse(collapsedTripleQuotesData);
    return dataWithoutComments;
  } catch {
    return null;
  }
};

const isValidJson = (dataString: string): boolean => {
  try {
    JSON.parse(dataString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Removes comments outside quoted strings, returning the original input when closed-comment removal cannot be validated.
 */
export const removeCommentsFromData = (dataString: string): string => {
  const scannerTokens = getRequestDataScannerTokens(dataString);
  const dataWithoutComments = removeCommentsFromDataWithTokens(dataString, scannerTokens);
  if (scannerTokens.some(isUnclosedBlockComment)) {
    return dataWithoutComments;
  }
  if (isValidJson(dataWithoutComments)) {
    return dataWithoutComments;
  }

  try {
    return JSON.stringify(parse(dataString), null, 2);
  } catch {
    if (!dataString.includes('"""')) {
      return dataString;
    }
    return removeCommentsFromDataWithTripleQuotes(dataString) ?? dataString;
  }
};
