/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldFromSource } from './get_field_from_source';

describe('getFieldFromSource', () => {
  it('reads a flattened dotted key inside a top-level container (OTel shape)', () => {
    const source = { attributes: { 'gen_ai.input.messages': '[{"role":"user"}]' } };

    expect(getFieldFromSource(source, 'attributes.gen_ai.input.messages')).toBe(
      '[{"role":"user"}]'
    );
  });

  it('reads a fully nested path (classic APM shape)', () => {
    const source = { span: { id: 'span-1' } };

    expect(getFieldFromSource(source, 'span.id')).toBe('span-1');
  });

  it('reads a fully flattened top-level key', () => {
    const source = { 'attributes.gen_ai.input.messages': '[]' };

    expect(getFieldFromSource(source, 'attributes.gen_ai.input.messages')).toBe('[]');
  });

  it('prefers the flattened-in-container value over the nested fallback', () => {
    const source = {
      attributes: {
        'gen_ai.input.messages': 'flattened',
        gen_ai: { input: { messages: 'nested' } },
      },
    };

    expect(getFieldFromSource(source, 'attributes.gen_ai.input.messages')).toBe('flattened');
  });

  it('returns undefined for missing fields and non-object sources', () => {
    expect(
      getFieldFromSource({ attributes: {} }, 'attributes.gen_ai.input.messages')
    ).toBeUndefined();
    expect(getFieldFromSource(null, 'attributes.gen_ai.input.messages')).toBeUndefined();
    expect(getFieldFromSource('not-an-object', 'attributes.gen_ai.input.messages')).toBeUndefined();
  });
});
