/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';

export type RequestDataTokenKind =
  | 'tripleQuotedString'
  | 'doubleQuotedString'
  | 'singleQuotedString'
  | 'lineComment'
  | 'blockComment';

export interface RequestDataToken {
  readonly kind: RequestDataTokenKind;
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

const requestDataTokensRegex = new RegExp(
  [
    /"""[\s\S]*?"""/.source,
    /"(?:\\.|[^"\\])*"/.source,
    /'(?:\\.|[^'\\])*'/.source,
    /\/\/[^\r\n]*/.source,
    /#[^\r\n]*/.source,
    /\/\*[\s\S]*?\*\//.source,
  ].join('|'),
  'g'
);

const requestDataScannerRegex = new RegExp(
  [
    /"""[\s\S]*?(?:"""|$)/.source,
    /"(?:\\[\s\S]|[^"\\])*(?:"|$)/.source,
    /'(?:\\[\s\S]|[^'\\])*(?:'|$)/.source,
    /\/\/[^\n]*(?:\n|$)/.source,
    /#[^\n]*(?:\n|$)/.source,
    /\/\*[\s\S]*?(?:\*\/|$)/.source,
  ].join('|'),
  'g'
);

const requestDataSemanticTokensRegex = new RegExp(
  [requestDataTokensRegex.source, /[{}\[\]:]/.source, /[^\s{}\[\]:,\/#]+/.source].join('|'),
  'g'
);

const getRequestDataTokenKind = (value: string): RequestDataTokenKind => {
  if (value.startsWith('"""')) {
    return 'tripleQuotedString';
  }
  if (value.startsWith('"')) {
    return 'doubleQuotedString';
  }
  if (value.startsWith("'")) {
    return 'singleQuotedString';
  }
  return value.startsWith('/*') ? 'blockComment' : 'lineComment';
};

const getTokens = (source: string, regex: RegExp): RequestDataToken[] => {
  return Array.from(source.matchAll(new RegExp(regex.source, 'g')), (match) => {
    const value = match[0];
    const start = match.index ?? 0;

    return {
      kind: getRequestDataTokenKind(value),
      value,
      start,
      end: start + value.length,
    };
  });
};

export const getRequestDataTokens = (source: string): RequestDataToken[] => {
  return getTokens(source, requestDataTokensRegex);
};

export const getRequestDataScannerTokens = (source: string): RequestDataToken[] => {
  return getTokens(source, requestDataScannerRegex);
};

export const getRequestDataSemanticTokens = (source: string): string[] => {
  return Array.from(
    source.matchAll(new RegExp(requestDataSemanticTokensRegex.source, 'g')),
    ([token]) => token
  );
};

export const isCommentToken = (token: RequestDataToken): boolean => {
  return token.kind === 'lineComment' || token.kind === 'blockComment';
};

export const isStringToken = (token: RequestDataToken): boolean => {
  return (
    token.kind === 'tripleQuotedString' ||
    token.kind === 'doubleQuotedString' ||
    token.kind === 'singleQuotedString'
  );
};

export const decodeStringToken = (token: string): string | undefined => {
  try {
    const decoded = parse(token);
    return typeof decoded === 'string' ? decoded : undefined;
  } catch {
    return undefined;
  }
};

export const replaceRequestDataTokens = (
  source: string,
  tokens: RequestDataToken[],
  replaceToken: (token: RequestDataToken) => string
): string => {
  const parts: string[] = [];
  let cursor = 0;

  for (const token of tokens) {
    parts.push(source.slice(cursor, token.start), replaceToken(token));
    cursor = token.end;
  }

  parts.push(source.slice(cursor));
  return parts.join('');
};
