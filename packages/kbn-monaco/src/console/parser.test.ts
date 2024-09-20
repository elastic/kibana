/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createParser } from './parser';
import { ConsoleParserResult } from './types';

const parser = createParser();
describe('console parser', () => {
  it('returns errors if input is not correct', () => {
    const input = 'Incorrect input';
    const parserResult = parser(input) as ConsoleParserResult;
    // the parser logs 2 errors: for the unexpected method and a general syntax error
    expect(parserResult.errors.length).toBe(2);
    // the parser logs a beginning of the request that it's trying to parse
    expect(parserResult.requests.length).toBe(1);
  });

  it('returns parsedRequests if the input is correct', () => {
    const input = 'GET _search';
    const { requests, errors } = parser(input) as ConsoleParserResult;
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
    const { requests } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(2);
    expect(requests[0].startOffset).toBe(0);
    expect(requests[0].endOffset).toBe(11);
    expect(requests[1].startOffset).toBe(12);
    expect(requests[1].endOffset).toBe(28);
  });

  it('parses a request with a request body', () => {
    const input =
      'GET _search\n' + '{\n' + '  "query": {\n' + '    "match_all": {}\n' + '  }\n' + '}';
    const { requests } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(1);
    const { startOffset, endOffset } = requests[0];
    expect(startOffset).toBe(0);
    expect(endOffset).toBe(52);
  });

  describe('case insensitive methods', () => {
    const expectedRequests = [
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
    it('allows upper case methods', () => {
      const input = 'GET _search\nPOST _search\nPATCH _search\nPUT _search\nHEAD _search';
      const { requests, errors } = parser(input) as ConsoleParserResult;
      expect(errors.length).toBe(0);
      expect(requests).toEqual(expectedRequests);
    });

    it('allows lower case methods', () => {
      const input = 'get _search\npost _search\npatch _search\nput _search\nhead _search';
      const { requests, errors } = parser(input) as ConsoleParserResult;
      expect(errors.length).toBe(0);
      expect(requests).toEqual(expectedRequests);
    });

    it('allows mixed case methods', () => {
      const input = 'GeT _search\npOSt _search\nPaTch _search\nPut _search\nheAD _search';
      const { requests, errors } = parser(input) as ConsoleParserResult;
      expect(errors.length).toBe(0);
      expect(requests).toEqual(expectedRequests);
    });
  });
});
