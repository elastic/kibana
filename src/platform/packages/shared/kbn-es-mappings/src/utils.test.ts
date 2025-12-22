/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omitUnsetKeys } from './utils';

describe('omitUnsetKeys', () => {
  it('omits undefined keys', () => {
    expect(omitUnsetKeys({ a: 1 }, { a: undefined })).toEqual({});

    expect(omitUnsetKeys({ a: 1 }, { a: undefined, b: 2 })).toEqual({ b: 2 });
    expect(omitUnsetKeys({ a: 1 }, { a: undefined, b: 2, c: undefined })).toEqual({ b: 2 });
    expect(omitUnsetKeys({ a: 1, b: 2 }, { a: undefined, c: undefined, d: 2 })).toEqual({
      b: 2,
      d: 2,
    });

    expect(
      omitUnsetKeys({ a: 1, removed_nested: { a: 1 } }, { removed_nested: undefined })
    ).toEqual({ a: 1 });
    expect(omitUnsetKeys({ a: 1, updated_nested: { a: 1 } }, { updated_nested: { b: 3 } })).toEqual(
      { a: 1, updated_nested: { b: 3 } }
    );
  });
});
