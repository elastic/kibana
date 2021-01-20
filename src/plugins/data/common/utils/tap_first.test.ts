/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { of } from 'rxjs';
import { tapFirst } from './tap_first';

describe('tapFirst', () => {
  it('should tap the first and only the first', () => {
    const fn = jest.fn();
    of(1, 2, 3).pipe(tapFirst(fn)).subscribe();
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith(1);
  });
});
