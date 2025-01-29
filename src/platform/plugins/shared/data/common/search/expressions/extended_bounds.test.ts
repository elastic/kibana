/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from './utils';
import { extendedBoundsFunction } from './extended_bounds';

describe('interpreter/functions#extendedBounds', () => {
  const fn = functionWrapper(extendedBoundsFunction);

  it('should return an extended bounds structure', () => {
    expect(fn(null, { min: 10, max: 100 })).toEqual(
      expect.objectContaining({
        max: 100,
        min: 10,
        type: 'extended_bounds',
      })
    );
  });
});
