/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { deepCloneWithBuffers } from './deep_clone_with_buffers';

describe('deepCloneWithBuffers()', () => {
  it('deep clones objects', () => {
    const source = {
      a: {
        b: {},
        c: {},
        d: [
          {
            e: 'f',
          },
        ],
      },
    };

    const output = deepCloneWithBuffers(source);

    expect(source.a).toEqual(output.a);
    expect(source.a).not.toBe(output.a);

    expect(source.a.b).toEqual(output.a.b);
    expect(source.a.b).not.toBe(output.a.b);

    expect(source.a.c).toEqual(output.a.c);
    expect(source.a.c).not.toBe(output.a.c);

    expect(source.a.d).toEqual(output.a.d);
    expect(source.a.d).not.toBe(output.a.d);

    expect(source.a.d[0]).toEqual(output.a.d[0]);
    expect(source.a.d[0]).not.toBe(output.a.d[0]);
  });

  it('copies buffers but keeps them buffers', () => {
    const input = Buffer.from('i am a teapot', 'utf8');
    const output = deepCloneWithBuffers(input);

    expect(Buffer.isBuffer(input)).toBe(true);
    expect(Buffer.isBuffer(output)).toBe(true);
    expect(Buffer.compare(output, input));
    expect(output).not.toBe(input);
  });

  it('copies buffers that are deep', () => {
    const input = {
      a: {
        b: {
          c: Buffer.from('i am a teapot', 'utf8'),
        },
      },
    };
    const output = deepCloneWithBuffers(input);

    expect(Buffer.isBuffer(input.a.b.c)).toBe(true);
    expect(Buffer.isBuffer(output.a.b.c)).toBe(true);
    expect(Buffer.compare(output.a.b.c, input.a.b.c));
    expect(output.a.b.c).not.toBe(input.a.b.c);
  });
});
