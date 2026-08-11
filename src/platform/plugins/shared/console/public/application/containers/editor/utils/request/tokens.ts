/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const requestDataTokensRegex = new RegExp(
  [
    /"""[\s\S]*?"""/.source, // Triple-quoted strings
    /"(?:\\.|[^"\\])*"/.source, // JSON strings
    /\/\/[^\r\n]*/.source, // // comments
    /#[^\r\n]*/.source, // # comments
    /\/\*[\s\S]*?\*\//.source, // Block comments
  ].join('|'),
  'g'
);

const isSlashCommentToken = (token: string) => token.startsWith('//') || token.startsWith('/*');
export const isCommentToken = (token: string) =>
  isSlashCommentToken(token) || token.startsWith('#');

export const containsCommentToken = (requestData: string): boolean => {
  requestDataTokensRegex.lastIndex = 0;
  let match = requestDataTokensRegex.exec(requestData);

  while (match) {
    if (isCommentToken(match[0])) {
      requestDataTokensRegex.lastIndex = 0;
      return true;
    }
    match = requestDataTokensRegex.exec(requestData);
  }

  requestDataTokensRegex.lastIndex = 0;
  return false;
};

export const replaceCommentTokens = (requestData: string): string => {
  return requestData.replace(requestDataTokensRegex, (token) =>
    isCommentToken(token) ? ' ' : token
  );
};
