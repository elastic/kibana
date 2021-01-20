/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BUCKET_TYPES } from '../buckets';
import { DateMetaByColumnDeps, getDateMetaByDatatableColumn } from './time_column_meta';

describe('getDateMetaByDatatableColumn', () => {
  let params: DateMetaByColumnDeps;
  beforeEach(() => {
    params = {
      calculateAutoTimeExpression: jest.fn().mockReturnValue('5m'),
      getIndexPattern: jest.fn().mockResolvedValue({}),
      isDefaultTimezone: jest.fn().mockReturnValue(true),
      getConfig: jest.fn(),
    };
  });

  it('returns nothing on column from other data source', async () => {
    expect(
      await getDateMetaByDatatableColumn(params)({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'essql',
        },
      })
    ).toEqual(undefined);
  });

  it('returns nothing on non date histogram column', async () => {
    expect(
      await getDateMetaByDatatableColumn(params)({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'esaggs',
          sourceParams: {
            type: BUCKET_TYPES.TERMS,
          },
        },
      })
    ).toEqual(undefined);
  });

  it('returns time range, time zone and interval', async () => {
    expect(
      await getDateMetaByDatatableColumn(params)({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'esaggs',
          sourceParams: {
            type: BUCKET_TYPES.DATE_HISTOGRAM,
            params: {
              time_zone: 'UTC',
              interval: '1h',
            },
            appliedTimeRange: {
              from: 'now-5d',
              to: 'now',
            },
          },
        },
      })
    ).toEqual({
      timeZone: 'UTC',
      timeRange: {
        from: 'now-5d',
        to: 'now',
      },
      interval: '1h',
    });
  });

  it('throws if unable to resolve interval', async () => {
    await expect(
      getDateMetaByDatatableColumn(params)({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'esaggs',
          sourceParams: {
            type: BUCKET_TYPES.DATE_HISTOGRAM,
            params: {
              time_zone: 'UTC',
              interval: 'auto',
            },
          },
        },
      })
    ).rejects.toBeDefined();

    await expect(
      getDateMetaByDatatableColumn(params)({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'esaggs',
          sourceParams: {
            type: BUCKET_TYPES.DATE_HISTOGRAM,
            params: {
              time_zone: 'UTC',
            },
          },
        },
      })
    ).rejects.toBeDefined();
  });

  it('returns resolved auto interval', async () => {
    expect(
      await getDateMetaByDatatableColumn(params)({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'esaggs',
          sourceParams: {
            type: BUCKET_TYPES.DATE_HISTOGRAM,
            params: {
              time_zone: 'UTC',
              interval: 'auto',
            },
            appliedTimeRange: {
              from: '2020-10-05T00:00:00.000Z',
              to: '2020-10-10T00:00:00.000Z',
            },
          },
        },
      })
    ).toEqual(
      expect.objectContaining({
        interval: '5m',
      })
    );
  });
});
