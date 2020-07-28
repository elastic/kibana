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
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import { FieldFormatsGetConfigFn, NumberFormat } from '../../../../common';
import { fieldFormatsServiceMock } from '../../../field_formats/mocks';
import { InternalStartServices } from '../../../types';

describe('Range Agg', () => {
  let aggTypesDependencies: RangeBucketAggDependencies;

  beforeEach(() => {
    aggTypesDependencies = {
      getInternalStartServices: () =>
        (({
          fieldFormats: fieldFormatsServiceMock.createStartContract(),
        } as unknown) as InternalStartServices),
    };
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
      }
    );
  };

  describe('getSerializedFormat', () => {
    test('generates a serialized field format in the expected shape', () => {
      const aggConfigs = getAggConfigs();
      const agg = aggConfigs.aggs[0];
      expect(agg.type.getSerializedFormat(agg)).toMatchInlineSnapshot(`
        Object {
          "id": "range",
          "params": Object {
            "id": "number",
            "params": Object {
              "pattern": "0,0.[000] b",
            },
          },
        }
      `);
    });
  });
});
