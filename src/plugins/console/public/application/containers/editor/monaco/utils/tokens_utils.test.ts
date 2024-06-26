/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseBody, removeTrailingWhitespaces } from './tokens_utils';

describe('tokens_utils', () => {
  describe('removeTrailingWhitespaces', () => {
    it(`works with an empty string`, () => {
      const url = '';
      const result = removeTrailingWhitespaces(url);
      expect(result).toBe(url);
    });
    it(`doesn't change the string if no trailing whitespaces`, () => {
      const url = '_search';
      const result = removeTrailingWhitespaces(url);
      expect(result).toBe(url);
    });
    it(`removes any text after the first whitespace`, () => {
      const url = '_search some_text';
      const result = removeTrailingWhitespaces(url);
      expect(result).toBe('_search');
    });
    it(`doesn't split a query parameter with whitespaces`, () => {
      const url = '_search?q="with whitespace"';
      const result = removeTrailingWhitespaces(url);
      expect(result).toBe(url);
    });
  });

  describe('parseBody', () => {
    const testCases: Array<{ value: string; tokens: string[] }> = [
      {
        // add opening curly brackets to tokens
        value: '{',
        tokens: ['{'],
      },
      {
        // allow whitespaces
        value: '  {',
        tokens: ['{'],
      },
      {
        // allow line comments
        value: '//comment\n{',
        tokens: ['{'],
      },
      {
        // inside the object line comment are ignored
        value: '{//comment',
        tokens: ['{'],
      },
      {
        value: '{//comment\n"test":',
        tokens: ['{', 'test'],
      },
      {
        // do not add property name if no colon (:)
        value: '{"test"',
        tokens: ['{'],
      },
      {
        // add property names to tokens (double quotes are removed)
        value: '{"test":',
        tokens: ['{', 'test'],
      },
      {
        // add nested object to tokens
        value: '{"test":{',
        tokens: ['{', 'test', '{'],
      },
      {
        // empty object
        value: '{}',
        tokens: [],
      },
      {
        // empty object with inline comment
        value: '{//comment\n}',
        tokens: [],
      },
      {
        value: '{"test":[',
        tokens: ['{', 'test', '['],
      },
      {
        value: '{"test":123,',
        tokens: ['{'],
      },
      {
        value: '{"test":{},',
        tokens: ['{'],
      },
      {
        value: '{"test":[],',
        tokens: ['{'],
      },
      {
        value: '{"property1":["nested1", []],"',
        tokens: ['{'],
      },
      {
        value: '{"property1":"value1","property2":',
        tokens: ['{', 'property2'],
      },
      {
        value: '{"property1":[123,',
        tokens: ['{', 'property1', '['],
      },
      {
        value: '{"property1":[123,"test"]',
        tokens: ['{'],
      },
      {
        value: '{"property1":{"nested1":"value"},"',
        tokens: ['{'],
      },
      {
        value: '{"property1":{"nested1":"value","nested2":{}},"',
        tokens: ['{'],
      },
      {
        value: '{\n  "explain": false,\n  "',
        tokens: ['{'],
      },
    ];
    for (const testCase of testCases) {
      const { value, tokens } = testCase;
      it(`${value}`, () => {
        const parsedTokens = parseBody(value);
        expect(parsedTokens).toEqual(tokens);
      });
    }
  });
});
