/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getNumberHistogramIntervalByDatatableColumn } from '.';
import { BUCKET_TYPES } from '../buckets';

describe('getNumberHistogramIntervalByDatatableColumn', () => {
  it('returns nothing on column from other data source', () => {
    expect(
      getNumberHistogramIntervalByDatatableColumn({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'essql',
        },
      })
    ).toEqual(undefined);
  });

  it('returns nothing on non histogram column', () => {
    expect(
      getNumberHistogramIntervalByDatatableColumn({
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

  it('returns interval on resolved auto interval', () => {
    expect(
      getNumberHistogramIntervalByDatatableColumn({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'esaggs',
          sourceParams: {
            type: BUCKET_TYPES.HISTOGRAM,
            params: {
              interval: 'auto',
              used_interval: 20,
            },
          },
        },
      })
    ).toEqual(20);
  });

  it('returns interval on fixed interval', () => {
    expect(
      getNumberHistogramIntervalByDatatableColumn({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'esaggs',
          sourceParams: {
            type: BUCKET_TYPES.HISTOGRAM,
            params: {
              interval: 7,
              used_interval: 7,
            },
          },
        },
      })
    ).toEqual(7);
  });

  it('returns undefined if information is not available', () => {
    expect(
      getNumberHistogramIntervalByDatatableColumn({
        id: 'test',
        name: 'test',
        meta: {
          type: 'date',
          source: 'esaggs',
          sourceParams: {
            type: BUCKET_TYPES.HISTOGRAM,
            params: {},
          },
        },
      })
    ).toEqual(undefined);
  });
});
