/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from './utils';
import { numericalRangeFunction } from './numerical_range';

describe('interpreter/functions#numericalRange', () => {
  const fn = functionWrapper(numericalRangeFunction);

  it('should return a numerical range structure', () => {
    expect(fn(null, { from: 1, to: 1000, label: 'something' })).toEqual(
      expect.objectContaining({
        from: 1,
        to: 1000,
        label: 'something',
        type: 'numerical_range',
      })
    );
  });
});
