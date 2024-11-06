/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SetMap } from './set_map';

describe('SetMap', () => {
  it('records unique values for fetching later', () => {
    const sm = new SetMap<string, string>();

    sm.add('foo', 'bar');
    sm.add('foo', 'bar');
    sm.add('foo', 'baz');
    sm.add('foo', 'baz');
    sm.add('baz', 'foo');

    expect(sm.get('foo')).toMatchInlineSnapshot(`
      Set {
        "bar",
        "baz",
      }
    `);
    expect(sm.get('baz')).toMatchInlineSnapshot(`
      Set {
        "foo",
      }
    `);
  });
});
