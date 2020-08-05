/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
