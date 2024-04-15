/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    const { method, url, startOffset, endOffset } = requests[0];
    expect(method).toBe('GET');
    expect(url).toBe('_search');
    // the start offset of the request is the beginning of the string
    expect(startOffset).toBe(0);
    // the end offset of the request is the end of the string
    expect(endOffset).toBe(11);
  });

  it('parses several requests', () => {
    const input = 'GET _search\nPOST _test_index';
    const { requests } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(2);
  });

  it('parses a request with a request body', () => {
    const input =
      'GET _search\n' + '{\n' + '  "query": {\n' + '    "match_all": {}\n' + '  }\n' + '}';
    const { requests } = parser(input) as ConsoleParserResult;
    expect(requests.length).toBe(1);
    const { method, url, data } = requests[0];
    expect(method).toBe('GET');
    expect(url).toBe('_search');
    expect(data).toEqual([
      {
        query: {
          match_all: {},
        },
      },
    ]);
  });
});
