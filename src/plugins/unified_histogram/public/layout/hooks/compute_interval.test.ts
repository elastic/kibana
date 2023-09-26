/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { calculateBounds } from '@kbn/data-plugin/public';
import { computeInterval } from './compute_interval';

describe('computeInterval', () => {
  const dataMock = dataPluginMock.createStartContract();
  dataMock.query.timefilter.timefilter.getTime = () => {
    return { from: '1991-03-29T08:04:00.694Z', to: '2021-03-29T07:04:00.695Z' };
  };
  dataMock.query.timefilter.timefilter.calculateBounds = (timeRange) => {
    return calculateBounds(timeRange);
  };

  it('should return correct interval for 24 hours timerange', () => {
    expect(
      computeInterval(
        {
          from: '2023-08-15T10:00:00.000Z',
          to: '2023-08-16T10:17:34.591Z',
        },
        dataMock
      )
    ).toEqual('30 minute');
  });

  it('should return correct interval for 7 days timerange', () => {
    expect(
      computeInterval(
        {
          from: '2023-08-08T21:00:00.000Z',
          to: '2023-08-16T10:18:56.569Z',
        },
        dataMock
      )
    ).toEqual('3 hour');
  });

  it('should return correct interval for 1 month timerange', () => {
    expect(
      computeInterval(
        {
          from: '2023-07-16T21:00:00.000Z',
          to: '2023-08-16T10:19:43.573Z',
        },
        dataMock
      )
    ).toEqual('12 hour');
  });

  it('should return correct interval for 1 year timerange', () => {
    expect(
      computeInterval(
        {
          from: '2022-08-15T21:00:00.000Z',
          to: '2023-08-16T10:21:18.589Z',
        },
        dataMock
      )
    ).toEqual('1 week');
  });
});
