/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getRequestDataScannerTokens,
  getRequestDataTokens,
  isCommentToken,
  replaceRequestDataTokens,
} from './tokens';

describe('request tokens', () => {
  describe('WHEN comment markers occur in quoted values', () => {
    it('SHOULD return only comments outside the values', () => {
      const requestData = [
        '{',
        '  "url": "https://elastic.co/#x",',
        "  'pattern': '//literal',",
        '  "script": """// painless""" // request comment',
        '}',
      ].join('\n');

      const comments = getRequestDataTokens(requestData)
        .filter(isCommentToken)
        .map(({ value }) => value);

      expect(comments).toEqual(['// request comment']);
    });
  });

  describe('WHEN a token is unclosed', () => {
    it('SHOULD keep the remaining text opaque for structural consumers', () => {
      const requestData = '{"script": """return 1;\n} // not a comment';
      const tokens = getRequestDataScannerTokens(requestData);

      expect(tokens.at(-1)).toMatchObject({
        kind: 'tripleQuotedString',
        value: '"""return 1;\n} // not a comment',
      });
    });
  });

  describe('WHEN replacing comment tokens', () => {
    it('SHOULD preserve comment-like text inside strings', () => {
      const requestData = '{"pattern":"//literal",/* remove */"value":1}';
      const withoutComments = replaceRequestDataTokens(
        requestData,
        getRequestDataTokens(requestData),
        (token) => (isCommentToken(token) ? ' ' : token.value)
      );

      expect(withoutComments).toBe('{"pattern":"//literal", "value":1}');
    });
  });
});
