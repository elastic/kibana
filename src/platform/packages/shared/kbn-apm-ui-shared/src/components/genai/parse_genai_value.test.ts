/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseNestedJson, unwrapToolResponse } from './parse_genai_value';

describe('parseNestedJson', () => {
  it('parses JSON strings, including JSON nested inside string fields', () => {
    expect(parseNestedJson('{"a":"{\\"b\\":1}","c":"text"}')).toEqual({ a: { b: 1 }, c: 'text' });
  });

  it('parses JSON strings nested deep inside objects and arrays', () => {
    const deep = { a: [{ b: { c: [{ d: { stdout: '{"took":14}' } }] } }] };
    expect(parseNestedJson(deep)).toEqual({ a: [{ b: { c: [{ d: { stdout: { took: 14 } } }] } }] });
  });

  it('leaves non-JSON strings untouched', () => {
    expect(parseNestedJson('[/workspace/file.md] lines 1-3')).toBe(
      '[/workspace/file.md] lines 1-3'
    );
  });
});

describe('unwrapToolResponse', () => {
  it('drops the { response } wrapper and the <tool_result> envelope', () => {
    const response = JSON.stringify({ response: '<tool_result>{"rows":[1,2]}</tool_result>' });
    expect(unwrapToolResponse(response)).toEqual({ rows: [1, 2] });
  });

  it('restores escaped closing tags inside the envelope', () => {
    expect(unwrapToolResponse('<tool_result>a <\\/tool_result> b</tool_result>')).toBe(
      'a </tool_result> b'
    );
  });

  it('keeps objects that have other keys besides response', () => {
    expect(unwrapToolResponse({ response: 'ok', status: 200 })).toEqual({
      response: 'ok',
      status: 200,
    });
  });

  it('returns plain text responses as-is', () => {
    expect(unwrapToolResponse('no results')).toBe('no results');
  });
});
