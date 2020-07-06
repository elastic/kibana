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

import Stream, { PassThrough, Readable, Writable, Transform } from 'stream';
import { createGzip } from 'zlib';

import expect from '@kbn/expect';

import {
  createConcatStream,
  createListStream,
  createPromiseFromStreams,
} from '../../../../legacy/utils';

import { createParseArchiveStreams } from '../parse';

describe('esArchiver createParseArchiveStreams', () => {
  describe('{ gzip: false }', () => {
    it('returns an array of streams', () => {
      const streams = createParseArchiveStreams({ gzip: false });
      expect(streams).to.be.an('array');
      expect(streams.length).to.be.greaterThan(0);
      streams.forEach((s) => expect(s).to.be.a(Stream));
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

        expect(output).to.eql({ a: 1 });
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

        expect(output).to.eql([{ a: 1 }, 1]);
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
        expect(await receivedPromise).to.eql({ a: 1 });
        input.write(Buffer.from('2}'));
        input.end();
        expect(await finalPromise).to.eql([{ a: 1 }, { a: 2 }]);
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
            createConcatStream(),
          ] as [Readable, ...Writable[]]);
          throw new Error('should have failed');
        } catch (err) {
          expect(err.message).to.contain('Unexpected number');
        }
      });
    });
  });

  describe('{ gzip: true }', () => {
    it('returns an array of streams', () => {
      const streams = createParseArchiveStreams({ gzip: true });
      expect(streams).to.be.an('array');
      expect(streams.length).to.be.greaterThan(0);
      streams.forEach((s) => expect(s).to.be.a(Stream));
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

        expect(output).to.eql({ a: 1 });
      });

      it('parses valid gzipped JSON strings separated by two newlines', async () => {
        const output = await createPromiseFromStreams([
          createListStream(['{\n', '  "a": 1\n', '}', '\n\n', '{"a":2}']),
          createGzip(),
          ...createParseArchiveStreams({ gzip: true }),
          createConcatStream([]),
        ] as [Readable, ...Writable[]]);

        expect(output).to.eql([{ a: 1 }, { a: 2 }]);
      });
    });

    it('parses blank files', async () => {
      const output = await createPromiseFromStreams([
        createListStream([]),
        createGzip(),
        ...createParseArchiveStreams({ gzip: true }),
        createConcatStream([]),
      ] as [Readable, ...Writable[]]);

      expect(output).to.eql([]);
    });

    describe('stream errors', () => {
      it('stops when the input is not valid gzip archive', async () => {
        try {
          await createPromiseFromStreams([
            createListStream([Buffer.from('{"a": 1}')]),
            ...createParseArchiveStreams({ gzip: true }),
            createConcatStream(),
          ] as [Readable, ...Writable[]]);
          throw new Error('should have failed');
        } catch (err) {
          expect(err.message).to.contain('incorrect header check');
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
      expect(output).to.eql({ a: 1 });
    });
  });
});
