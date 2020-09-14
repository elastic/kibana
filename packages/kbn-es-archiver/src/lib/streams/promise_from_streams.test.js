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

import { Readable, Writable, Duplex, Transform } from 'stream';

import { createListStream, createPromiseFromStreams, createReduceStream } from './';

describe('promiseFromStreams', () => {
  test('pipes together an array of streams', async () => {
    const str1 = createListStream([1, 2, 3]);
    const str2 = createReduceStream((acc, n) => acc + n, 0);
    const sumPromise = new Promise((resolve) => str2.once('data', resolve));
    createPromiseFromStreams([str1, str2]);
    await new Promise((resolve) => str2.once('end', resolve));
    expect(await sumPromise).toBe(6);
  });

  describe('last stream is writable', () => {
    test('waits for the last stream to finish writing', async () => {
      let written = '';

      await createPromiseFromStreams([
        createListStream(['a']),
        new Writable({
          write(chunk, enc, cb) {
            setTimeout(() => {
              written += chunk;
              cb();
            }, 100);
          },
        }),
      ]);

      expect(written).toBe('a');
    });

    test('resolves to undefined', async () => {
      const result = await createPromiseFromStreams([
        createListStream(['a']),
        new Writable({
          write(chunk, enc, cb) {
            cb();
          },
        }),
      ]);

      expect(result).toBe(undefined);
    });
  });

  describe('last stream is readable', () => {
    test(`resolves to it's final value`, async () => {
      const result = await createPromiseFromStreams([createListStream(['a', 'b', 'c'])]);

      expect(result).toBe('c');
    });
  });

  describe('last stream is duplex', () => {
    test('waits for writing and resolves to final value', async () => {
      let written = '';

      const duplexReadQueue = [];
      const duplexItemsToPush = ['foo', 'bar', null];
      const result = await createPromiseFromStreams([
        createListStream(['a', 'b', 'c']),
        new Duplex({
          async read() {
            const result = await duplexReadQueue.shift();
            this.push(result);
          },

          write(chunk, enc, cb) {
            duplexReadQueue.push(
              new Promise((resolve) => {
                setTimeout(() => {
                  written += chunk;
                  cb();
                  resolve(duplexItemsToPush.shift());
                }, 50);
              })
            );
          },
        }).setEncoding('utf8'),
      ]);

      expect(written).toEqual('abc');
      expect(result).toBe('bar');
    });
  });

  describe('error handling', () => {
    test('read stream gets destroyed when transform stream fails', async () => {
      let destroyCalled = false;
      const readStream = new Readable({
        read() {
          this.push('a');
          this.push('b');
          this.push('c');
          this.push(null);
        },
        destroy() {
          destroyCalled = true;
        },
      });
      const transformStream = new Transform({
        transform(chunk, enc, done) {
          done(new Error('Test error'));
        },
      });
      try {
        await createPromiseFromStreams([readStream, transformStream]);
        throw new Error('Should fail');
      } catch (e) {
        expect(e.message).toBe('Test error');
        expect(destroyCalled).toBe(true);
      }
    });
  });
});
