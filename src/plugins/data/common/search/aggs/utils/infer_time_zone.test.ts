/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

import { IndexPattern } from '../../../index_patterns';
import { AggParamsDateHistogram } from '../buckets';
import { inferTimeZone } from './infer_time_zone';

describe('inferTimeZone', () => {
  it('reads time zone from agg params', () => {
    const params: AggParamsDateHistogram = {
      time_zone: 'CEST',
    };
    expect(inferTimeZone(params, {} as IndexPattern, () => false, jest.fn())).toEqual('CEST');
  });

  it('reads time zone from index pattern type meta if available', () => {
    expect(
      inferTimeZone(
        { field: 'mydatefield' },
        ({
          typeMeta: {
            aggs: {
              date_histogram: {
                mydatefield: {
                  time_zone: 'UTC',
                },
              },
            },
          },
        } as unknown) as IndexPattern,
        () => false,
        jest.fn()
      )
    ).toEqual('UTC');
  });

  it('reads time zone from moment if set to default', () => {
    expect(inferTimeZone({}, {} as IndexPattern, () => true, jest.fn())).toEqual('CET');
  });

  it('reads time zone from config if not set to default', () => {
    expect(
      inferTimeZone(
        {},
        {} as IndexPattern,
        () => false,
        () => 'CET' as any
      )
    ).toEqual('CET');
  });
});
