/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('moment', () => {
  const moment: any = jest.fn(() => {
    return {
      format: jest.fn(() => '-1;00'),
    };
  });
  moment.tz = {
    guess: jest.fn(() => 'CET'),
  };
  return moment;
});

import type { DataView } from '@kbn/data-views-plugin/common';
import { IndexPatternField } from '../../..';
import { AggParamsDateHistogram } from '../buckets';
import { inferTimeZone } from './infer_time_zone';

describe('inferTimeZone', () => {
  it('reads time zone from agg params', () => {
    const params: AggParamsDateHistogram = {
      time_zone: 'CEST',
    };
    expect(inferTimeZone(params, {} as DataView, () => false, jest.fn())).toEqual('CEST');
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
        () => false,
        jest.fn()
      )
    ).toEqual('UTC');
  });

  it('reads time zone from index pattern type meta if available when the field is not a string', () => {
    expect(
      inferTimeZone(
        {
          field: {
            name: 'mydatefield',
          } as IndexPatternField,
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
        () => false,
        jest.fn()
      )
    ).toEqual('UTC');
  });

  it('reads time zone from moment if set to default', () => {
    expect(inferTimeZone({}, {} as DataView, () => true, jest.fn())).toEqual('CET');
  });

  it('reads time zone from config if not set to default', () => {
    expect(
      inferTimeZone(
        {},
        {} as DataView,
        () => false,
        () => 'CET' as any
      )
    ).toEqual('CET');
  });
});
