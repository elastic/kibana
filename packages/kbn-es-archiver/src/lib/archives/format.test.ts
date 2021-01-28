/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Stream, { Readable, Writable } from 'stream';
import { createGunzip } from 'zlib';

import { createListStream, createPromiseFromStreams, createConcatStream } from '@kbn/utils';

import { createFormatArchiveStreams } from './format';

const INPUTS = [1, 2, { foo: 'bar' }, [1, 2]];
const INPUT_JSON = INPUTS.map((i) => JSON.stringify(i, null, 2)).join('\n\n');

describe('esArchiver createFormatArchiveStreams', () => {
  describe('{ gzip: false }', () => {
    it('returns an array of streams', () => {
      const streams = createFormatArchiveStreams({ gzip: false });
      expect(streams).toBeInstanceOf(Array);
      expect(streams.length).toBeGreaterThan(0);
      streams.forEach((s) => expect(s).toBeInstanceOf(Stream));
    });

    it('streams consume js values and produces buffers', async () => {
      const output = await createPromiseFromStreams<Buffer[]>([
        createListStream(INPUTS),
        ...createFormatArchiveStreams({ gzip: false }),
        createConcatStream([]),
      ] as [Readable, ...Writable[]]);

      expect(output.length).toBeGreaterThan(0);
      output.forEach((b) => expect(b).toBeInstanceOf(Buffer));
    });

    it('product is pretty-printed JSON separated by two newlines', async () => {
      const json = await createPromiseFromStreams([
        createListStream(INPUTS),
        ...createFormatArchiveStreams({ gzip: false }),
        createConcatStream(''),
      ] as [Readable, ...Writable[]]);

      expect(json).toBe(INPUT_JSON);
    });
  });

  describe('{ gzip: true }', () => {
    it('returns an array of streams', () => {
      const streams = createFormatArchiveStreams({ gzip: true });
      expect(streams).toBeInstanceOf(Array);
      expect(streams.length).toBeGreaterThan(0);
      streams.forEach((s) => expect(s).toBeInstanceOf(Stream));
    });

    it('streams consume js values and produces buffers', async () => {
      const output = await createPromiseFromStreams<Buffer[]>([
        createListStream([1, 2, { foo: 'bar' }, [1, 2]]),
        ...createFormatArchiveStreams({ gzip: true }),
        createConcatStream([]),
      ] as [Readable, ...Writable[]]);

      expect(output.length).toBeGreaterThan(0);
      output.forEach((b) => expect(b).toBeInstanceOf(Buffer));
    });

    it('output can be gunzipped', async () => {
      const output = await createPromiseFromStreams([
        createListStream(INPUTS),
        ...createFormatArchiveStreams({ gzip: true }),
        createGunzip(),
        createConcatStream(''),
      ] as [Readable, ...Writable[]]);
      expect(output).toBe(INPUT_JSON);
    });
  });

  describe('defaults', () => {
    it('product is not gzipped', async () => {
      const json = await createPromiseFromStreams([
        createListStream(INPUTS),
        ...createFormatArchiveStreams(),
        createConcatStream(''),
      ] as [Readable, ...Writable[]]);

      expect(json).toBe(INPUT_JSON);
    });
  });
});
