/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseBody, removeTrailingWhitespaces, parseUrl, parseLine } from './tokens_utils';

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

  describe('parseLine', () => {
    it('works with a comment', () => {
      const { method, url } = parseLine('GET _search // a comment');
      expect(method).toBe('GET');
      expect(url).toBe('_search');
    });
    it('works with a url param', () => {
      const { method, url, urlPathTokens, urlParamsTokens } = parseLine(
        'GET _search?query="test1 test2 test3" // comment'
      );
      expect(method).toBe('GET');
      expect(url).toBe('_search?query="test1 test2 test3"');
      expect(urlPathTokens).toEqual(['_search']);
      expect(urlParamsTokens[0]).toEqual(['query', '"test1 test2 test3"']);
    });
    it('works with multiple whitespaces', () => {
      const { method, url, urlPathTokens, urlParamsTokens } = parseLine(
        ' GET   _search?query="test1     test2    test3"    //   comment'
      );
      expect(method).toBe('GET');
      expect(url).toBe('_search?query="test1     test2    test3"');
      expect(urlPathTokens).toEqual(['_search']);
      expect(urlParamsTokens[0]).toEqual(['query', '"test1     test2    test3"']);
    });
    it('normalizes the method to upper case', () => {
      const { method, url, urlPathTokens, urlParamsTokens } = parseLine('Get _');
      expect(method).toBe('GET');
      expect(url).toBe('_');
      expect(urlPathTokens).toEqual(['_']);
      expect(urlParamsTokens).toEqual([]);
    });
    it('correctly parses the line when the url is empty, no whitespace', () => {
      const { method, url, urlPathTokens, urlParamsTokens } = parseLine('GET');
      expect(method).toBe('GET');
      expect(url).toBe('');
      expect(urlPathTokens).toEqual([]);
      expect(urlParamsTokens).toEqual([]);
    });
    it('correctly parses the line when the url is empty, with whitespace', () => {
      const { method, url, urlPathTokens, urlParamsTokens } = parseLine('GET ');
      expect(method).toBe('GET');
      expect(url).toBe('');
      expect(urlPathTokens).toEqual([]);
      expect(urlParamsTokens).toEqual([]);
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

  describe('parseUrl', () => {
    it('groups more than 1 slashes together when splitting', () => {
      const url = '_search//test';
      const result = parseUrl(url);
      expect(result.urlPathTokens).toEqual(['_search', 'test']);
    });

    it('filters out empty tokens', () => {
      const url = '/_search/test/';
      const result = parseUrl(url);
      expect(result.urlPathTokens).toEqual(['_search', 'test']);
    });
  });
});
