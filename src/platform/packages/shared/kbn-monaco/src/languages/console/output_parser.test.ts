/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createOutputParser } from './output_parser';
import { ConsoleOutputParserResult } from './types';

const parser = createOutputParser();
describe('console output parser', () => {
  it('returns errors if input is not correct', () => {
    const input = 'x';
    const parserResult = parser(input) as ConsoleOutputParserResult;

    expect(parserResult.responses.length).toBe(1);
    // the parser should generate an invalid input error
    expect(parserResult.errors).toContainEqual({ text: 'Invalid input', offset: 1 });
  });

  it('returns parsed responses if the input is correct', () => {
    const input = `# 1: GET /my-index/_doc/0 \n { "_index": "my-index" }`;
    const { responses, errors } = parser(input) as ConsoleOutputParserResult;
    expect(responses.length).toBe(1);
    expect(errors.length).toBe(0);
    const { data } = responses[0];

    const expected = [{ _index: 'my-index' }];
    expect(data).toEqual(expected);
  });

  it('parses several responses', () => {
    const input = `# 1: GET /my-index/_doc/0 \n { "_index": "my-index" } \n # 2: GET /my-index/_doc/1 \n { "_index": "my-index" }`;
    const { responses } = parser(input) as ConsoleOutputParserResult;
    expect(responses.length).toBe(2);
  });
});
