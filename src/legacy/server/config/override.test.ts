/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { override } from './override';

describe('override(target, source)', function () {
  it('should override the values form source to target', function () {
    const target = {
      test: {
        enable: true,
        host: ['something else'],
        client: {
          type: 'sql',
        },
      },
    };

    const source = {
      test: {
        host: ['host-01', 'host-02'],
        client: {
          type: 'nosql',
        },
        foo: {
          bar: {
            baz: 1,
          },
        },
      },
    };

    expect(override(target, source)).toMatchInlineSnapshot(`
      Object {
        "test": Object {
          "client": Object {
            "type": "nosql",
          },
          "enable": true,
          "foo": Object {
            "bar": Object {
              "baz": 1,
            },
          },
          "host": Array [
            "host-01",
            "host-02",
          ],
        },
      }
    `);
  });

  it('does not mutate arguments', () => {
    const target = {
      foo: {
        bar: 1,
        baz: 1,
      },
    };

    const source = {
      foo: {
        bar: 2,
      },
      box: 2,
    };

    expect(override(target, source)).toMatchInlineSnapshot(`
      Object {
        "box": 2,
        "foo": Object {
          "bar": 2,
          "baz": 1,
        },
      }
    `);
    expect(target).not.toHaveProperty('box');
    expect(source.foo).not.toHaveProperty('baz');
  });

  it('explodes keys with dots in them', () => {
    const target = {
      foo: {
        bar: 1,
      },
      'baz.box.boot.bar.bar': 20,
    };

    const source = {
      'foo.bar': 2,
      'baz.box.boot': {
        'bar.foo': 10,
      },
    };

    expect(override(target, source)).toMatchInlineSnapshot(`
      Object {
        "baz": Object {
          "box": Object {
            "boot": Object {
              "bar": Object {
                "bar": 20,
                "foo": 10,
              },
            },
          },
        },
        "foo": Object {
          "bar": 2,
        },
      }
    `);
  });
});
