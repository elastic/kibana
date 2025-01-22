/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { inferTimeZone } from './infer_time_zone';

describe('inferTimeZone', () => {
  it('reads time zone from agg params', () => {
    const params = {
      time_zone: 'CEST',
    };
    expect(
      inferTimeZone(params, {} as DataView, 'date_histogram', jest.fn().mockReturnValue('UTC'))
    ).toEqual('CEST');
  });

  it('reads time zone from index pattern type meta if available', () => {
    expect(
      inferTimeZone(
        { field: 'mydatefield' },
        {
          typeMeta: {
            aggs: {
              date_histogram: {
                mydatefield: {
                  time_zone: 'UTC',
                },
              },
            },
          },
        } as unknown as DataView,
        'date_histogram',
        jest.fn().mockReturnValue('CET')
      )
    ).toEqual('UTC');
  });

  it('reads time zone from index pattern type meta if available when the field is not a string', () => {
    expect(
      inferTimeZone(
        {
          field: {
            name: 'mydatefield',
          } as DataViewField,
        },
        {
          typeMeta: {
            aggs: {
              date_histogram: {
                mydatefield: {
                  time_zone: 'UTC',
                },
              },
            },
          },
        } as unknown as DataView,
        'date_histogram',
        jest.fn().mockReturnValue('CET')
      )
    ).toEqual('UTC');
  });

  it('reads time zone from config if not set to default', () => {
    expect(
      inferTimeZone({}, {} as DataView, 'date_histogram', jest.fn().mockReturnValue('CET'))
    ).toEqual('CET');
  });
});
