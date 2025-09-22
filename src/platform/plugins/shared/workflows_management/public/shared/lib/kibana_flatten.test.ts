/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kibanaFlatten } from './kibana_flatten';

describe('kibanaFlatten', () => {
  it('should flatten simple object', () => {
    const obj = {
      a: 1,
      b: { c: 2 },
    };
    const flattened = kibanaFlatten(obj);
    expect(flattened).toEqual({ a: 1, 'b.c': 2 });
  });

  it('should flatten object with arrays', () => {
    const obj = {
      a: 1,
      b: [{ c: 2 }, { c: 3 }],
    };
    const flattened = kibanaFlatten(obj);
    expect(flattened).toEqual({ a: 1, 'b.c': [2, 3] });
  });
});
