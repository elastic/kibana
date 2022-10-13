/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable, Writable, Duplex, Transform } from 'stream';

import { createListStream, createPromiseFromStreams, createReduceStream } from '.';

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

      const duplexReadQueue: Array<Promise<unknown>> = [];
      const duplexItemsToPush = ['foo', 'bar', null];
      const result = await createPromiseFromStreams([
        createListStream(['a', 'b', 'c']),
        new Duplex({
          async read() {
            this.push(await duplexReadQueue.shift());
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
