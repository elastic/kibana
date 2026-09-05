/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';
import { containsComments } from '../comments';
import { collapseTripleQuoteStrings, expandTripleQuoteStrings } from '../triple_quotes';
import {
  decodeStringToken,
  getRequestDataScannerTokens,
  getRequestDataSemanticTokens,
  isCommentToken,
} from '../tokens';
import { formatCommentLayout } from './comment_layout';
import { formatWithHjson } from './hjson_adapter';

export type RequestDataFormatStatus = 'formatted' | 'commentFallback' | 'invalidData';

export interface RequestDataFormatResult {
  readonly text: string;
  readonly status: RequestDataFormatStatus;
}

const getCommentTokens = (requestData: string): string[] => {
  return getRequestDataScannerTokens(requestData)
    .filter(isCommentToken)
    .map(({ value }) => value);
};

const hasSameValues = (first: string[], second: string[]): boolean => {
  return first.length === second.length && first.every((value, index) => value === second[index]);
};

const preservesComments = (source: string, formatted: string): boolean => {
  return hasSameValues(getCommentTokens(source), getCommentTokens(formatted));
};

const getSemanticTokens = (requestData: string): string[] => {
  return getRequestDataSemanticTokens(requestData)
    .filter((token) => !token.startsWith('//') && !token.startsWith('/*') && !token.startsWith('#'))
    .map((token) => {
      if (!token.startsWith('"') && !token.startsWith("'")) {
        return token;
      }

      const decoded = decodeStringToken(token);
      return decoded === undefined ? `raw:${token}` : `string:${JSON.stringify(decoded)}`;
    });
};

const preservesSemanticTokens = (source: string, formatted: string): boolean => {
  return hasSameValues(getSemanticTokens(source), getSemanticTokens(formatted));
};

const indentData = (
  dataString: string,
  { preserveComments = false }: { preserveComments?: boolean } = {}
): RequestDataFormatResult => {
  try {
    if (!preserveComments) {
      return {
        text: JSON.stringify(parse(dataString), null, 2),
        status: 'formatted',
      };
    }

    const eol = dataString.includes('\r\n') ? '\r\n' : '\n';
    const stringifiedData = formatWithHjson(dataString, eol);
    const formattedData = formatCommentLayout(dataString, stringifiedData, eol);

    return preservesComments(dataString, formattedData) &&
      preservesSemanticTokens(dataString, formattedData)
      ? { text: formattedData, status: 'formatted' }
      : { text: dataString, status: 'commentFallback' };
  } catch {
    return {
      text: dataString,
      status: preserveComments ? 'commentFallback' : 'invalidData',
    };
  }
};

export const formatRequestData = (data: string): RequestDataFormatResult => {
  const { collapsedTripleQuotesData, tripleQuoteStrings, marker } =
    collapseTripleQuoteStrings(data);
  const result = indentData(collapsedTripleQuotesData, {
    preserveComments: containsComments(data),
  });

  return {
    ...result,
    text: expandTripleQuoteStrings(result.text, tripleQuoteStrings, marker),
  };
};
