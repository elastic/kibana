/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform } from 'stream';
import { createSplitStream, createConcatStream, createPromiseFromStreams } from '.';

async function split(stream: Transform, input: Array<Buffer | string>) {
  const concat = createConcatStream();
  concat.write([]);
  stream.pipe(concat);
  const output = createPromiseFromStreams([concat]);

  input.forEach((i: any) => {
    stream.write(i);
  });
  stream.end();

  return await output;
}

describe('splitStream', () => {
  test('splits buffers, produces strings', async () => {
    const output = await split(createSplitStream('&'), [Buffer.from('foo&bar')]);
    expect(output).toEqual(['foo', 'bar']);
  });

  test('supports mixed input', async () => {
    const output = await split(createSplitStream('&'), [Buffer.from('foo&b'), 'ar']);
    expect(output).toEqual(['foo', 'bar']);
  });

  test('supports buffer split chunks', async () => {
    const output = await split(createSplitStream(Buffer.from('&')), ['foo&b', 'ar']);
    expect(output).toEqual(['foo', 'bar']);
  });

  test('splits provided values by a delimiter', async () => {
    const output = await split(createSplitStream('&'), ['foo&b', 'ar']);
    expect(output).toEqual(['foo', 'bar']);
  });

  test('handles multi-character delimiters', async () => {
    const output = await split(createSplitStream('oo'), ['foo&b', 'ar']);
    expect(output).toEqual(['f', '&bar']);
  });

  test('handles delimiters that span multiple chunks', async () => {
    const output = await split(createSplitStream('ba'), ['foo&b', 'ar']);
    expect(output).toEqual(['foo&', 'r']);
  });

  test('produces an empty chunk if the split char is at the end of the input', async () => {
    const output = await split(createSplitStream('&bar'), ['foo&b', 'ar']);
    expect(output).toEqual(['foo', '']);
  });
});
