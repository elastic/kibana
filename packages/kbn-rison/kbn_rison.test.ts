/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rison from './kbn_rison';

describe('encoding', () => {
  it('encodes basic values', () => {
    expect(Rison.encode(false)).toMatchInlineSnapshot(`"!f"`);
    expect(Rison.encode(true)).toMatchInlineSnapshot(`"!t"`);
    expect(Rison.encode(1)).toMatchInlineSnapshot(`"1"`);
    expect(Rison.encode([1])).toMatchInlineSnapshot(`"!(1)"`);
    expect(Rison.encode(['1'])).toMatchInlineSnapshot(`"!('1')"`);
    expect(Rison.encode([null])).toMatchInlineSnapshot(`"!(!n)"`);
    expect(Rison.encode([undefined])).toMatchInlineSnapshot(`"!()"`);
    expect(Rison.encode(null)).toMatchInlineSnapshot(`"!n"`);
  });
  it('throws if it received undefined', () => {
    expect(() => Rison.encode(undefined)).toThrowErrorMatchingInlineSnapshot(
      `"unable to encode value into rison, expected a primitive value array or object"`
    );
  });
  it('encodes a complex object', () => {
    expect(
      Rison.encode({
        foo: 1,
        bar: {
          bax: 1,
          bar: [
            'x',
            {
              a: /foo/,
              b: new Date(0),
            },
          ],
        },
      })
    ).toMatchInlineSnapshot(`"(bar:(bar:!(x,(a:(),b:'1970-01-01T00:00:00.000Z')),bax:1),foo:1)"`);
  });
  it('encodes arrays directly as well', () => {
    expect(Rison.encodeArray([1, 2, 3])).toMatchInlineSnapshot(`"1,2,3"`);
  });
});

describe('decoding', () => {
  it('decodes a simple rison string', () => {
    expect(Rison.decode('!f')).toMatchInlineSnapshot(`false`);
    expect(Rison.decode('!t')).toMatchInlineSnapshot(`true`);
    expect(Rison.decode('1')).toMatchInlineSnapshot(`1`);
    expect(Rison.decode('!(1)')).toMatchInlineSnapshot(`
      Array [
        1,
      ]
    `);
    expect(Rison.decode("!('1')")).toMatchInlineSnapshot(`
      Array [
        "1",
      ]
    `);
    expect(Rison.decode('!(!n)')).toMatchInlineSnapshot(`
      Array [
        null,
      ]
    `);
    expect(Rison.decode('!()')).toMatchInlineSnapshot(`Array []`);
    expect(Rison.decode('!n')).toMatchInlineSnapshot(`null`);
  });
  it('decodes a complex rison string', () => {
    expect(Rison.decode(`(bar:(bar:!(x,(a:(),b:'1970-01-01T00:00:00.000Z')),bax:1),foo:1)`))
      .toMatchInlineSnapshot(`
      Object {
        "bar": Object {
          "bar": Array [
            "x",
            Object {
              "a": Object {},
              "b": "1970-01-01T00:00:00.000Z",
            },
          ],
          "bax": 1,
        },
        "foo": 1,
      }
    `);
  });
  it('decodes an encoded array', () => {
    expect(Rison.decodeArray('1,2,3')).toMatchInlineSnapshot(`
      Array [
        1,
        2,
        3,
      ]
    `);
  });
});
