/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/es-query';
import { utcMinute } from 'd3-time';
import memoizeOne from 'memoize-one';
import moment from 'moment';
import { Timestamp } from '../../types';
import { DataAccessService } from './state_machine';

export interface LogExplorerHistogramDataPoint {
  startTime: Timestamp;
  countByBreakdownCriterion: Record<string, number>;
}

export const selectHistogramDataPoints = (
  state: DataAccessService['state']
): LogExplorerHistogramDataPoint[] => {
  const { timeRange } = state.context;

  // TODO: use actual data
  const testData = generateTestData(timeRange);

  return testData;
};

const generateTestData = memoizeOne((timeRange: TimeRange) => {
  const testDataPoints =
    utcMinute
      .every(2)
      ?.range(moment.utc(timeRange.from).toDate(), moment.utc(timeRange.to).toDate()) ?? [];

  const testData = testDataPoints.map(
    (startDate): LogExplorerHistogramDataPoint => ({
      startTime: startDate.toISOString(),
      countByBreakdownCriterion: {
        field1: Math.floor(Math.random() * 100),
      },
    })
  );

  return testData;
});

// const testData: LogExplorerHistogramDataPoint[] = [
//   {
//     startTime: '2022-08-15T00:00:00.000Z',
//     countByBreakdownCriterion: {
//       field1: 10,
//     },
//   },
//   {
//     startTime: '2022-08-15T01:00:00.000Z',
//     countByBreakdownCriterion: {
//       field1: 2,
//     },
//   },
//   {
//     startTime: '2022-08-15T02:00:00.000Z',
//     countByBreakdownCriterion: {
//       field1: 5,
//     },
//   },
//   {
//     startTime: '2022-08-15T03:00:00.000Z',
//     countByBreakdownCriterion: {
//       field1: 4,
//     },
//   },
// ];
