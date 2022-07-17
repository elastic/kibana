/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IntervalHistogram } from '@kbn/core-metrics-server';
import moment from 'moment';

export function createMockRawNsDataHistogram(
  overwrites: Partial<IntervalHistogram> = {}
): IntervalHistogram {
  const now = Date.now();

  const mockedRawCollectedDataInNs = {
    min: 9093120,
    max: 53247999,
    mean: 11993238,
    exceeds: 0,
    stddev: 1168191,
    fromTimestamp: moment(now).toISOString(),
    lastUpdatedAt: moment(now).toISOString(),
    percentiles: {
      '50': 12607487,
      '75': 12615679,
      '95': 12648447,
      '99': 12713983,
    },
    ...overwrites,
  };
  return mockedRawCollectedDataInNs;
}
