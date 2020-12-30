/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
