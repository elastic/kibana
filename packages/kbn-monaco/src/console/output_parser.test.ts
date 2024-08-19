/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createOutputParser } from './output_parser';
import { ConsoleOutputParserResult } from './types';

const parser = createOutputParser();
describe('console output parser', () => {
  it('returns errors if input is not correct', () => {
    const input = '{';
    const parserResult = parser(input) as ConsoleOutputParserResult;
    // the parser logs 2 errors: for the unexpected method and a general syntax error
    expect(parserResult.errors.length).toBe(1);
    // the parser logs a beginning of the request that it's trying to parse
    expect(parserResult.requests.length).toBe(1);
  });

  it('returns parsedRequests if the input is correct', () => {
    const input = `# 1: GET /my-index/_doc/0 \n { "_index": "my-index" }`;
    const { requests, errors } = parser(input) as ConsoleOutputParserResult;
    expect(requests.length).toBe(1);
    expect(errors.length).toBe(0);
    const { data } = requests[0];

    const expected = [{ _index: 'my-index' }];
    expect(data).toEqual(expected);
  });

  it('parses several requests', () => {
    const input = `# 1: GET /my-index/_doc/0 \n { "_index": "my-index" } \n # 2: GET /my-index/_doc/1 \n { "_index": "my-index" }`;
    const { requests } = parser(input) as ConsoleOutputParserResult;
    expect(requests.length).toBe(2);
  });
});
