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

import { getRangeBucketAgg, RangeBucketAggDependencies } from './range';
import { AggConfigs } from '../agg_configs';
import { mockDataServices, mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import { FieldFormatsGetConfigFn, NumberFormat } from '../../../../common';
import { fieldFormatsServiceMock } from '../../../field_formats/mocks';
import { notificationServiceMock } from '../../../../../../../src/core/public/mocks';
import { InternalStartServices } from '../../../types';

const buckets = [
  {
    to: 1024,
    to_as_string: '1024.0',
    doc_count: 20904,
  },
  {
    from: 1024,
    from_as_string: '1024.0',
    to: 2560,
    to_as_string: '2560.0',
    doc_count: 23358,
  },
  {
    from: 2560,
    from_as_string: '2560.0',
    doc_count: 174250,
  },
];

describe('Range Agg', () => {
  let aggTypesDependencies: RangeBucketAggDependencies;

  beforeEach(() => {
    aggTypesDependencies = {
      getInternalStartServices: () =>
        (({
          fieldFormats: fieldFormatsServiceMock.createStartContract(),
          notifications: notificationServiceMock.createStartContract(),
        } as unknown) as InternalStartServices),
    };

    mockDataServices();
  });

  const getConfig = (() => {}) as FieldFormatsGetConfigFn;
  const getAggConfigs = () => {
    const field = {
      name: 'bytes',
      format: new NumberFormat(
        {
          pattern: '0,0.[000] b',
        },
        getConfig
      ),
    };

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
    } as any;

    return new AggConfigs(
      indexPattern,
      [
        {
          type: BUCKET_TYPES.RANGE,
          schema: 'segment',
          params: {
            field: 'bytes',
            ranges: [
              { from: 0, to: 1000 },
              { from: 1000, to: 2000 },
            ],
          },
        },
      ],
      {
        typesRegistry: mockAggTypesRegistry([getRangeBucketAgg(aggTypesDependencies)]),
        fieldFormats: aggTypesDependencies.getInternalStartServices().fieldFormats,
      }
    );
  };

  describe('formating', () => {
    test('formats bucket keys properly', () => {
      const aggConfigs = getAggConfigs();
      const agg = aggConfigs.aggs[0];
      const format = (val: any) => agg.fieldFormatter()(agg.getKey(val));

      expect(format(buckets[0])).toBe('≥ -∞ and < 1 KB');
      expect(format(buckets[1])).toBe('≥ 1 KB and < 2.5 KB');
      expect(format(buckets[2])).toBe('≥ 2.5 KB and < +∞');
    });
  });
});
