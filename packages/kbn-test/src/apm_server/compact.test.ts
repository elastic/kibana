/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compact } from './compact';

it('strips undefined values and empty objects/arrays from an object', () => {
  const compacted = compact({
    foo: 'bar',
    a: {
      b: {
        c: {
          d: undefined,
        },
      },
      bb: {
        cc: {
          v: null,
        },
      },
    },
    aa: {
      bb: {
        c: [1, 2],
        d: [undefined],
        e: 'foo',
        f: {
          g: {
            h: undefined,
          },
        },
      },
    },
  });

  expect(compacted).toMatchInlineSnapshot(`
    Object {
      "a": Object {
        "bb": Object {
          "cc": Object {
            "v": null,
          },
        },
      },
      "aa": Object {
        "bb": Object {
          "c": Array [
            1,
            2,
          ],
          "e": "foo",
        },
      },
      "foo": "bar",
    }
  `);
});
