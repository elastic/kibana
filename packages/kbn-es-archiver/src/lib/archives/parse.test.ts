/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Stream, { PassThrough, Readable, Writable, Transform } from 'stream';
import { createGzip } from 'zlib';

import { createConcatStream, createListStream, createPromiseFromStreams } from '@kbn/utils';

import { createParseArchiveStreams } from './parse';

describe('esArchiver createParseArchiveStreams', () => {
  describe('{ gzip: false }', () => {
    it('returns an array of streams', () => {
      const streams = createParseArchiveStreams({ gzip: false });
      expect(streams).toBeInstanceOf(Array);
      expect(streams.length).toBeGreaterThan(0);
      streams.forEach((s) => expect(s).toBeInstanceOf(Stream));
    });

    describe('streams', () => {
      it('consume buffers of valid JSON', async () => {
        const output = await createPromiseFromStreams([
          createListStream([
            Buffer.from('{'),
            Buffer.from('"'),
            Buffer.from('a":'),
            Buffer.from('1}'),
          ]),
          ...createParseArchiveStreams({ gzip: false }),
        ]);

        expect(output).toEqual({ a: 1 });
      });
      it('consume buffers of valid JSON separated by two newlines', async () => {
        const output = await createPromiseFromStreams([
          createListStream([
            Buffer.from('{'),
            Buffer.from('"'),
            Buffer.from('a":'),
            Buffer.from('1}'),
            Buffer.from('\n'),
            Buffer.from('\n'),
            Buffer.from('1'),
          ]),
          ...createParseArchiveStreams({ gzip: false }),
          createConcatStream([]),
        ] as [Readable, ...Writable[]]);

        expect(output).toEqual([{ a: 1 }, 1]);
      });

      it('provides each JSON object as soon as it is parsed', async () => {
        let onReceived: (resolved: any) => void;
        const receivedPromise = new Promise((resolve) => (onReceived = resolve));
        const input = new PassThrough();
        const check = new Transform({
          writableObjectMode: true,
          readableObjectMode: true,
          transform(chunk, env, callback) {
            onReceived(chunk);
            callback(undefined, chunk);
          },
        });

        const finalPromise = createPromiseFromStreams([
          input as Readable,
          ...createParseArchiveStreams(),
          check,
          createConcatStream([]),
        ] as [Readable, ...Writable[]]);

        input.write(Buffer.from('{"a": 1}\n\n{"a":'));
        expect(await receivedPromise).toEqual({ a: 1 });
        input.write(Buffer.from('2}'));
        input.end();
        expect(await finalPromise).toEqual([{ a: 1 }, { a: 2 }]);
      });
    });

    describe('stream errors', () => {
      it('stops when any document contains invalid json', async () => {
        try {
          await createPromiseFromStreams([
            createListStream([
              Buffer.from('{"a": 1}\n\n'),
              Buffer.from('{1}\n\n'),
              Buffer.from('{"a": 2}\n\n'),
            ]),
            ...createParseArchiveStreams({ gzip: false }),
            createConcatStream([]),
          ] as [Readable, ...Writable[]]);
          throw new Error('should have failed');
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining('Unexpected number'));
        }
      });
    });
  });

  describe('{ gzip: true }', () => {
    it('returns an array of streams', () => {
      const streams = createParseArchiveStreams({ gzip: true });
      expect(streams).toBeInstanceOf(Array);
      expect(streams.length).toBeGreaterThan(0);
      streams.forEach((s) => expect(s).toBeInstanceOf(Stream));
    });

    describe('streams', () => {
      it('consumes gzipped buffers of valid JSON', async () => {
        const output = await createPromiseFromStreams([
          createListStream([
            Buffer.from('{'),
            Buffer.from('"'),
            Buffer.from('a":'),
            Buffer.from('1}'),
          ]),
          createGzip(),
          ...createParseArchiveStreams({ gzip: true }),
        ]);

        expect(output).toEqual({ a: 1 });
      });

      it('parses valid gzipped JSON strings separated by two newlines', async () => {
        const output = await createPromiseFromStreams([
          createListStream(['{\n', '  "a": 1\n', '}', '\n\n', '{"a":2}']),
          createGzip(),
          ...createParseArchiveStreams({ gzip: true }),
          createConcatStream([]),
        ] as [Readable, ...Writable[]]);

        expect(output).toEqual([{ a: 1 }, { a: 2 }]);
      });
    });

    it('parses blank files', async () => {
      const output = await createPromiseFromStreams([
        createListStream([]),
        createGzip(),
        ...createParseArchiveStreams({ gzip: true }),
        createConcatStream([]),
      ] as [Readable, ...Writable[]]);

      expect(output).toEqual([]);
    });

    describe('stream errors', () => {
      it('stops when the input is not valid gzip archive', async () => {
        try {
          await createPromiseFromStreams([
            createListStream([Buffer.from('{"a": 1}')]),
            ...createParseArchiveStreams({ gzip: true }),
            createConcatStream([]),
          ] as [Readable, ...Writable[]]);
          throw new Error('should have failed');
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining('incorrect header check'));
        }
      });
    });
  });

  describe('defaults', () => {
    it('does not try to gunzip the content', async () => {
      const output = await createPromiseFromStreams([
        createListStream([Buffer.from('{"a": 1}')]),
        ...createParseArchiveStreams(),
      ]);
      expect(output).toEqual({ a: 1 });
    });
  });
});
