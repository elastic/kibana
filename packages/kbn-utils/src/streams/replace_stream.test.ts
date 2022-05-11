/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Writable, Readable } from 'stream';

import {
  createReplaceStream,
  createConcatStream,
  createPromiseFromStreams,
  createListStream,
  createMapStream,
} from '.';

async function concatToString(streams: [Readable, ...Writable[]]) {
  return await createPromiseFromStreams([
    ...streams,
    createMapStream((buff: Buffer) => buff.toString('utf8')),
    createConcatStream(''),
  ]);
}

describe('replaceStream', () => {
  test('produces buffers when it receives buffers', async () => {
    const chunks = await createPromiseFromStreams<Buffer[]>([
      createListStream([Buffer.from('foo'), Buffer.from('bar')]),
      createReplaceStream('o', '0'),
      createConcatStream([]),
    ]);

    chunks.forEach((chunk) => {
      expect(chunk).toBeInstanceOf(Buffer);
    });
  });

  test('produces buffers when it receives strings', async () => {
    const chunks = await createPromiseFromStreams<string[]>([
      createListStream(['foo', 'bar']),
      createReplaceStream('o', '0'),
      createConcatStream([]),
    ]);

    chunks.forEach((chunk) => {
      expect(chunk).toBeInstanceOf(Buffer);
    });
  });

  test('expects toReplace to be a string', () => {
    // @ts-expect-error
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
