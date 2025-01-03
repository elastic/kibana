/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from './utils';
import { dateRangeFunction } from './date_range';

describe('interpreter/functions#dateRange', () => {
  const fn = functionWrapper(dateRangeFunction);

  it('should return a date range structure', () => {
    expect(fn(null, { from: 'now-1d', to: 'now' })).toEqual(
      expect.objectContaining({
        from: 'now-1d',
        to: 'now',
        type: 'date_range',
      })
    );
  });
});
