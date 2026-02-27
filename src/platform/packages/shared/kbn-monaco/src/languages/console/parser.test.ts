/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createParser } from './parser';

const parser = createParser();
describe('console parser', () => {
  const expectedCaseInsensitiveRequests = [
    {
      startOffset: 0,
      endOffset: 11,
    },
    {
      startOffset: 12,
      endOffset: 24,
    },
    {
      startOffset: 25,
      endOffset: 38,
    },
    {
      startOffset: 39,
      endOffset: 50,
    },
    {
      startOffset: 51,
      endOffset: 63,
    },
  ];

  it('returns errors if input is not correct', () => {
    const input = 'Incorrect input';
    const parserResult = parser(input)!;
    // the parser logs 2 errors: for the unexpected method and a general syntax error
    expect(parserResult.errors.length).toBe(2);
    // the parser logs a beginning of the request that it's trying to parse
    expect(parserResult.requests.length).toBe(1);
  });

  it('returns parsedRequests if the input is correct', () => {
    const input = 'GET _search';
    const { requests, errors } = parser(input)!;
    expect(requests.length).toBe(1);
    expect(errors.length).toBe(0);
    const { startOffset, endOffset } = requests[0];
    // the start offset of the request is the beginning of the string
    expect(startOffset).toBe(0);
    // the end offset of the request is the end of the string
    expect(endOffset).toBe(11);
  });

  it('parses several requests', () => {
    const input = 'GET _search\nPOST _test_index';
    const { requests } = parser(input)!;
    expect(requests.length).toBe(2);
    expect(requests[0].startOffset).toBe(0);
    expect(requests[0].endOffset).toBe(11);
    expect(requests[1].startOffset).toBe(12);
    expect(requests[1].endOffset).toBe(28);
  });

  it('parses a request with a request body', () => {
    const input =
      'GET _search\n' + '{\n' + '  "query": {\n' + '    "match_all": {}\n' + '  }\n' + '}';
    const { requests } = parser(input)!;
    expect(requests.length).toBe(1);
    const { startOffset, endOffset } = requests[0];
    expect(startOffset).toBe(0);
    expect(endOffset).toBe(52);
  });

  it('parses requests with an error', () => {
    const input =
      'GET _search\n' +
      '{ERROR\n' +
      '  "query": {\n' +
      '    "match_all": {}\n' +
      '  }\n' +
      '}\n\n' +
      'POST _test_index';
    const { requests, errors } = parser(input)!;
    expect(requests.length).toBe(2);
    expect(requests[0].startOffset).toBe(0);
    expect(requests[0].endOffset).toBe(57);
    expect(requests[1].startOffset).toBe(59);
    expect(requests[1].endOffset).toBe(75);
    expect(errors.length).toBe(1);
    expect(errors[0].offset).toBe(14);
    expect(errors[0].text).toBe('Bad string');
  });

  it('parses requests with an error and a comment before the next request', () => {
    const input =
      'GET _search\n' +
      '{ERROR\n' +
      '  "query": {\n' +
      '    "match_all": {}\n' +
      '  }\n' +
      '}\n\n' +
      '# This is a comment\n' +
      'POST _test_index\n' +
      '// Another comment\n';
    const { requests, errors } = parser(input)!;
    expect(requests.length).toBe(2);
    expect(requests[0].startOffset).toBe(0);
    expect(requests[0].endOffset).toBe(57);
    expect(requests[1].startOffset).toBe(79); // The next request should start after the comment
    expect(requests[1].endOffset).toBe(95);
    expect(errors.length).toBe(1);
    expect(errors[0].offset).toBe(14);
    expect(errors[0].text).toBe('Bad string');
  });

  it('parses upper case methods', () => {
    const input = 'GET _search\nPOST _search\nPATCH _search\nPUT _search\nHEAD _search';
    const { requests, errors } = parser(input)!;
    expect(errors.length).toBe(0);
    expect(requests).toEqual(expectedCaseInsensitiveRequests);
  });

  it('parses lower case methods', () => {
    const input = 'get _search\npost _search\npatch _search\nput _search\nhead _search';
    const { requests, errors } = parser(input)!;
    expect(errors.length).toBe(0);
    expect(requests).toEqual(expectedCaseInsensitiveRequests);
  });

  it('parses mixed case methods', () => {
    const input = 'GeT _search\npOSt _search\nPaTch _search\nPut _search\nheAD _search';
    const { requests, errors } = parser(input)!;
    expect(errors.length).toBe(0);
    expect(requests).toEqual(expectedCaseInsensitiveRequests);
  });

  it('skips multiline comments before the request', () => {
    const input = '/* c */\nGET _search';
    const { requests, errors } = parser(input)!;
    expect(errors).toEqual([]);
    expect(requests).toEqual([{ startOffset: 8, endOffset: 19 }]);
  });

  it('parses exponent numbers in the request body without errors', () => {
    const input = 'GET _search\n{ "n": 1e2 }';
    const { requests, errors } = parser(input)!;
    expect(errors).toEqual([]);
    expect(requests).toEqual([{ startOffset: 0, endOffset: 24 }]);
  });

  it('parses unicode escapes in the request body without errors', () => {
    const input = 'GET _search\n{ "s": "\\u0041" }';
    const { requests, errors } = parser(input)!;
    expect(errors).toEqual([]);
    expect(requests).toEqual([{ startOffset: 0, endOffset: 29 }]);
  });

  it('parses triple-quoted strings in the request body without errors', () => {
    const input = 'GET _search\n{ "s": """foo""" }';
    const { requests, errors } = parser(input)!;
    expect(errors).toEqual([]);
    expect(requests).toEqual([{ startOffset: 0, endOffset: 30 }]);
  });

  it('emits duplicate-key error and continues parsing next request', () => {
    const input = 'GET _search\n{ "a": 1, "a": 2 }\n\nPOST _test';
    const { requests, errors } = parser(input)!;
    expect(errors).toEqual([{ text: 'Duplicate key "a"', offset: 27 }]);
    expect(requests).toEqual([
      { startOffset: 0, endOffset: 30 },
      { startOffset: 32, endOffset: 42 },
    ]);
  });

  it('emits missing-url error and continues parsing next request', () => {
    const input = 'GET\nPOST _test';
    const { requests, errors } = parser(input)!;
    expect(errors).toEqual([{ text: 'Missing url', offset: 4 }]);
    expect(requests).toEqual([
      { startOffset: 0, endOffset: 3 },
      { startOffset: 4, endOffset: 14 },
    ]);
  });

  it('handles # and // comment lines between requests', () => {
    const input = '# c\nGET _search\n// c2\nPOST _test';
    const { requests, errors } = parser(input)!;
    expect(errors).toEqual([]);
    expect(requests).toEqual([
      { startOffset: 4, endOffset: 15 },
      { startOffset: 22, endOffset: 32 },
    ]);
  });
});
