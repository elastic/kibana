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

import { createSplitStream, createConcatStream, createPromiseFromStreams } from './';

async function split(stream, input) {
  const concat = createConcatStream();
  concat.write([]);
  stream.pipe(concat);
  const output = createPromiseFromStreams([concat]);

  input.forEach(i => {
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
