/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import { merge } from './merge';

describe('merge', () => {
  test('empty objects', () => expect(merge({}, {})).toEqual({}));

  test('basic', () => {
    expect(merge({}, { a: 1 })).toEqual({ a: 1 });
    expect(merge({ a: 0 }, {})).toEqual({ a: 0 });
    expect(merge({ a: 0 }, { a: 1 })).toEqual({ a: 1 });
  });

  test('undefined', () => {
    expect(merge({ a: undefined }, { a: 1 })).toEqual({ a: 1 });
    expect(merge({ a: 0 }, { a: undefined })).toEqual({ a: 0 });
    expect(merge({ a: undefined }, { a: undefined })).toEqual({});
    expect(merge({ a: void 0 }, { a: void 0 })).toEqual({});
  });

  test('null', () => {
    expect(merge({ a: null }, { a: 1 })).toEqual({ a: 1 });
    expect(merge({ a: 0 }, { a: null })).toEqual({ a: null });
    expect(merge({ a: null }, { a: null })).toEqual({ a: null });
  });

  test('arrays', () => {
    expect(merge({ b: [0] }, { b: [2] })).toEqual({ b: [2] });
    expect(merge({ b: [0, 1] }, { b: [2] })).toEqual({ b: [2] });
    expect(merge({ b: [0] }, { b: [2, 3] })).toEqual({ b: [2, 3] });
    expect(merge({ b: [] }, { b: [2] })).toEqual({ b: [2] });
    expect(merge({ b: [0] }, { b: [] })).toEqual({ b: [] });
  });

  test('nested objects', () => {
    expect(merge({ top: { a: 0, b: 0 } }, { top: { a: 1, c: 1 } })).toEqual({
      top: { a: 1, b: 0, c: 1 },
    });
    expect(merge({ top: { a: 0, b: 0 } }, { top: [0, 1] })).toEqual({ top: [0, 1] });
  });

  test('multiple objects', () => {
    expect(merge({}, { a: 1 }, { a: 2 })).toEqual({ a: 2 });
    expect(merge({ a: 0 }, {}, {})).toEqual({ a: 0 });
    expect(merge({ a: 0 }, { a: 1 }, {})).toEqual({ a: 1 });
  });

  test('does not merge class instances', () => {
    class Folder {
      constructor(public readonly path: string) {}
      getPath() {
        return this.path;
      }
    }
    class File {
      constructor(public readonly content: string) {}
      getContent() {
        return this.content;
      }
    }
    const folder = new Folder('/etc');
    const file = new File('yolo');

    const result = merge({}, { content: folder }, { content: file });
    expect(result).toStrictEqual({
      content: file,
    });
    expect(result.content.getContent()).toBe('yolo');
  });

  test(`doesn't pollute prototypes`, () => {
    merge({}, JSON.parse('{ "__proto__": { "foo": "bar" } }'));
    merge({}, JSON.parse('{ "constructor": { "prototype": { "foo": "bar" } } }'));
    merge(
      {},
      JSON.parse('{ "__proto__": { "foo": "bar" } }'),
      JSON.parse('{ "constructor": { "prototype": { "foo": "bar" } } }')
    );
    expect(({} as any).foo).toBe(undefined);
  });
});
