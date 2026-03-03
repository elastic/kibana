/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createOutputParser } from './output_parser';

const parser = createOutputParser();
describe('console output parser', () => {
  it('returns parsed responses if the input is correct', () => {
    const input = `# 1: GET /my-index/_doc/0 \n { "_index": "my-index" }`;
    const { responses, errors } = parser(input)!;
    expect(responses.length).toBe(1);
    expect(errors.length).toBe(0);
    const { data } = responses[0];

    const expected = [{ _index: 'my-index' }];
    expect(data).toEqual(expected);
  });

  it('returns both invalid-input and syntax-error annotations for non-object input', () => {
    const input = 'x';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [
        { text: 'Invalid input', offset: 1 },
        { text: 'Syntax error', offset: 1 },
      ],
      responses: [{ startOffset: 0 }],
    });
  });

  it('parses exponent numbers inside objects', () => {
    const input = '{ "n": 1e2 }';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [],
      responses: [
        {
          startOffset: 0,
          data: [{ n: 100 }],
          endOffset: 12,
        },
      ],
    });
  });

  it('parses unicode escapes inside strings', () => {
    const input = '{ "s": "\\u0041" }';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [],
      responses: [
        {
          startOffset: 0,
          data: [{ s: 'A' }],
          endOffset: 17,
        },
      ],
    });
  });

  it('parses triple-quoted strings', () => {
    const input = '{ "s": """foo""" }';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [],
      responses: [
        {
          startOffset: 0,
          data: [{ s: 'foo' }],
          endOffset: 18,
        },
      ],
    });
  });

  it('parses array responses', () => {
    const input = '[{ "a": 1 }]';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [],
      responses: [
        {
          startOffset: 0,
          data: [{ a: 1 }],
          endOffset: 12,
        },
      ],
    });
  });

  it('accepts null array elements', () => {
    const input = '[null]';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [],
      responses: [
        {
          startOffset: 0,
          data: [null],
          endOffset: 6,
        },
      ],
    });
  });

  it('emits array-element error for non-object array elements', () => {
    const input = '[1]';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [{ text: 'Array elements must be objects', offset: 4 }],
      responses: [{ startOffset: 0 }],
    });
  });

  it('skips multiline comments before the response', () => {
    const input = '/* c */\n{ "a": 1 }';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [],
      responses: [
        {
          startOffset: 8,
          data: [{ a: 1 }],
          endOffset: 18,
        },
      ],
    });
  });

  it('parses responses separated by # headers', () => {
    const input = '# 1: GET /a\n{ "a": 1 }\n# 2: GET /b\n{ "b": 2 }';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [],
      responses: [
        {
          startOffset: 12,
          data: [{ a: 1 }],
          endOffset: 22,
        },
        {
          startOffset: 35,
          data: [{ b: 2 }],
          endOffset: 45,
        },
      ],
    });
  });

  it('parses multi-doc object responses as a single response with multiple data items', () => {
    const input = '{"a":1}\n{"b":2}';
    const parserResult = parser(input)!;
    expect(parserResult).toEqual({
      errors: [],
      responses: [
        {
          startOffset: 0,
          data: [{ a: 1 }, { b: 2 }],
          endOffset: 15,
        },
      ],
    });
  });
});
