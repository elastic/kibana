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

import {
  createReplaceStream,
  createConcatStream,
  createPromiseFromStreams,
  createListStream,
  createMapStream,
} from './';

async function concatToString(streams) {
  return await createPromiseFromStreams([
    ...streams,
    createMapStream(buff => buff.toString('utf8')),
    createConcatStream(''),
  ]);
}

describe('replaceStream', () => {
  test('produces buffers when it receives buffers', async () => {
    const chunks = await createPromiseFromStreams([
      createListStream([Buffer.from('foo'), Buffer.from('bar')]),
      createReplaceStream('o', '0'),
      createConcatStream([]),
    ]);

    chunks.forEach(chunk => {
      expect(chunk).toBeInstanceOf(Buffer);
    });
  });

  test('produces buffers when it receives strings', async () => {
    const chunks = await createPromiseFromStreams([
      createListStream(['foo', 'bar']),
      createReplaceStream('o', '0'),
      createConcatStream([]),
    ]);

    chunks.forEach(chunk => {
      expect(chunk).toBeInstanceOf(Buffer);
    });
  });

  test('expects toReplace to be a string', () => {
    expect(() => createReplaceStream(Buffer.from('foo'))).toThrowError(/be a string/);
  });

  test('replaces multiple single-char instances in a single chunk', async () => {
    expect(
      await concatToString([
        createListStream([Buffer.from('f00 bar')]),
        createReplaceStream('0', 'o'),
      ])
    ).toBe('foo bar');
  });

  test('replaces multiple single-char instances in multiple chunks', async () => {
    expect(
      await concatToString([
        createListStream([Buffer.from('f0'), Buffer.from('0 bar')]),
        createReplaceStream('0', 'o'),
      ])
    ).toBe('foo bar');
  });

  test('replaces single multi-char instances in single chunks', async () => {
    expect(
      await concatToString([
        createListStream([Buffer.from('f0'), Buffer.from('0 bar')]),
        createReplaceStream('0', 'o'),
      ])
    ).toBe('foo bar');
  });

  test('replaces multiple multi-char instances in single chunks', async () => {
    expect(
      await concatToString([
        createListStream([Buffer.from('foo ba'), Buffer.from('r b'), Buffer.from('az bar')]),
        createReplaceStream('bar', '*'),
      ])
    ).toBe('foo * baz *');
  });

  test('replaces multi-char instance that stretches multiple chunks', async () => {
    expect(
      await concatToString([
        createListStream([
          Buffer.from('foo supe'),
          Buffer.from('rcalifra'),
          Buffer.from('gilistic'),
          Buffer.from('expialid'),
          Buffer.from('ocious bar'),
        ]),
        createReplaceStream('supercalifragilisticexpialidocious', '*'),
      ])
    ).toBe('foo * bar');
  });

  test('ignores missing multi-char instance', async () => {
    expect(
      await concatToString([
        createListStream([
          Buffer.from('foo supe'),
          Buffer.from('rcalifra'),
          Buffer.from('gili stic'),
          Buffer.from('expialid'),
          Buffer.from('ocious bar'),
        ]),
        createReplaceStream('supercalifragilisticexpialidocious', '*'),
      ])
    ).toBe('foo supercalifragili sticexpialidocious bar');
  });
});
