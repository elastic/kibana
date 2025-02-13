/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ItemBuffer, ItemBufferParams } from '../item_buffer';

export const runItemBufferTests = (
  Buffer: new <Params extends ItemBufferParams<any>>(params: Params) => ItemBuffer<any>
) => {
  describe('ItemBuffer', () => {
    test('can create with or without optional "flushOnMaxItems" param', () => {
      new Buffer({
        onFlush: () => {},
      });

      new Buffer({
        onFlush: () => {},
        flushOnMaxItems: 123,
      });
    });

    test('can add items to the buffer', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      buf.write('a');
      buf.write('b');
      buf.write('c');
    });

    test('returns number of items in the buffer', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      expect(buf.length).toBe(0);
      buf.write('a');
      expect(buf.length).toBe(1);
      buf.write('b');
      expect(buf.length).toBe(2);
      buf.write('c');
      expect(buf.length).toBe(3);
    });

    test('returns correct number of items after .clear() was called', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      expect(buf.length).toBe(0);
      buf.write('a');
      expect(buf.length).toBe(1);
      buf.clear();
      buf.write('b');
      expect(buf.length).toBe(1);
      buf.write('c');
      expect(buf.length).toBe(2);
    });

    test('returns correct number of items after .flush() was called', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      expect(buf.length).toBe(0);
      buf.write('a');
      expect(buf.length).toBe(1);
      buf.flush();
      buf.write('b');
      expect(buf.length).toBe(1);
      buf.write('c');
      expect(buf.length).toBe(2);
    });

    test('can flush buffer and receive items in chronological order', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      buf.write('a');
      buf.write('b');
      buf.write('c');

      buf.flush();

      expect(onFlush).toHaveBeenCalledTimes(1);
      expect(onFlush.mock.calls[0][0]).toEqual(['a', 'b', 'c']);
    });

    test('clears buffer after flush', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      buf.write('a');
      buf.write('b');
      buf.write('c');

      buf.flush();

      expect(onFlush).toHaveBeenCalledTimes(1);
      expect(onFlush.mock.calls[0][0]).toEqual(['a', 'b', 'c']);

      buf.write('d');

      buf.flush();

      expect(onFlush).toHaveBeenCalledTimes(2);
      expect(onFlush.mock.calls[1][0]).toEqual(['d']);
    });

    test('can call .flush() any time as many times as needed', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      buf.flush();
      buf.write(123);
      buf.flush();
      buf.flush();
      buf.flush();

      expect(onFlush).toHaveBeenCalledTimes(4);
      expect(onFlush.mock.calls[0][0]).toEqual([]);
      expect(onFlush.mock.calls[1][0]).toEqual([123]);
      expect(onFlush.mock.calls[2][0]).toEqual([]);
      expect(onFlush.mock.calls[3][0]).toEqual([]);
    });

    test('calling .clear() before .flush() cases to return empty list', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      buf.write(1);
      buf.write(2);
      buf.clear();
      buf.flush();

      expect(onFlush).toHaveBeenCalledTimes(1);
      expect(onFlush.mock.calls[0][0]).toEqual([]);
    });

    test('can call .clear() any time as many times as needed', () => {
      const onFlush = jest.fn();
      const buf = new Buffer({
        onFlush,
      });

      buf.clear();
      buf.flush();
      buf.write(123);
      buf.clear();
      buf.flush();
      buf.clear();
      buf.clear();
      buf.flush();
      buf.flush();

      expect(onFlush).toHaveBeenCalledTimes(4);
      expect(onFlush.mock.calls[0][0]).toEqual([]);
      expect(onFlush.mock.calls[1][0]).toEqual([]);
      expect(onFlush.mock.calls[2][0]).toEqual([]);
      expect(onFlush.mock.calls[3][0]).toEqual([]);
    });

    describe('when `flushOnMaxItems` is set', () => {
      test('does not flush automatically before `flushOnMaxItems` is reached', () => {
        const onFlush = jest.fn();
        const buf = new Buffer({
          onFlush,
          flushOnMaxItems: 2,
        });

        buf.write(1);

        expect(onFlush).toHaveBeenCalledTimes(0);
      });

      test('automatically flushes buffer when `flushOnMaxItems` is reached', () => {
        const onFlush = jest.fn();
        const buf = new Buffer({
          onFlush,
          flushOnMaxItems: 2,
        });

        buf.write(1);
        buf.write(2);

        expect(onFlush).toHaveBeenCalledTimes(1);
        expect(onFlush.mock.calls[0][0]).toEqual([1, 2]);
      });

      test('flushes again when `flushOnMaxItems` limit is reached the second time', () => {
        const onFlush = jest.fn();
        const buf = new Buffer({
          onFlush,
          flushOnMaxItems: 2,
        });

        buf.write(1);
        buf.write(2);
        buf.write(3);
        buf.write(4);
        buf.write(5);
        buf.flush();

        expect(onFlush).toHaveBeenCalledTimes(3);
        expect(onFlush.mock.calls[0][0]).toEqual([1, 2]);
        expect(onFlush.mock.calls[1][0]).toEqual([3, 4]);
        expect(onFlush.mock.calls[2][0]).toEqual([5]);
      });
    });
  });
};
