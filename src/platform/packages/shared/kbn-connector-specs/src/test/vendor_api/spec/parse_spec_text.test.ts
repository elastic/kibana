/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseSpecText } from './parse_spec_text';

describe('parseSpecText', () => {
  it('parses JSON and YAML', () => {
    expect(parseSpecText(' {"openapi": "3.1.0"}')).toEqual({ openapi: '3.1.0' });
    expect(parseSpecText('openapi: 3.1.0\ninfo: { title: Example }')).toEqual({
      openapi: '3.1.0',
      info: { title: 'Example' },
    });
  });

  it('accepts the YAML vendors publish: duplicate keys and many aliases', () => {
    expect(parseSpecText('a: 1\na: 2')).toEqual({ a: 2 });
    const aliases = Array.from({ length: 200 }, (_, index) => `k${index}: *x`).join('\n');
    expect(parseSpecText(`x: &x { y: 1 }\n${aliases}`)).toHaveProperty('k199', { y: 1 });
  });
});
