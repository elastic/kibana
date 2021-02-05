/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getLastMetric } from './get_last_metric';

describe('getLastMetric(series)', () => {
  test('returns the last metric', () => {
    const series = {
      metrics: [
        { id: 1, type: 'avg' },
        { id: 2, type: 'moving_average' },
      ],
    };
    expect(getLastMetric(series)).toEqual({ id: 2, type: 'moving_average' });
  });
  test('returns the last metric that not a series_agg', () => {
    const series = {
      metrics: [
        { id: 1, type: 'avg' },
        { id: 2, type: 'series_agg' },
      ],
    };
    expect(getLastMetric(series)).toEqual({ id: 1, type: 'avg' });
  });
});
