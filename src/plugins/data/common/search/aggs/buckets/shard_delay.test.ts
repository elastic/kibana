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

import { AggConfigs } from '../agg_configs';
import { FieldFormatsGetConfigFn, NumberFormat } from '../../../../common/field_formats';
import { getShardDelayBucketAgg, SHARD_DELAY_AGG_NAME } from './shard_delay';

describe('Shard Delay Agg', () => {
  const getConfig = (() => {}) as FieldFormatsGetConfigFn;
  const getAggConfigs = () => {
    const field = { name: 'bytes' };

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
      getFormatterForField: () =>
        new NumberFormat(
          {
            pattern: '0,0.[000] b',
          },
          getConfig
        ),
    } as any;

    return new AggConfigs(
      indexPattern,
      [
        {
          type: SHARD_DELAY_AGG_NAME,
          params: {
            duration: 1000,
          },
        },
      ],
      {
        typesRegistry: {
          get: getShardDelayBucketAgg,
        } as any,
      }
    );
  };

  describe('write', () => {
    test('writes the delay as the value parameter', () => {
      const aggConfigs = getAggConfigs();
      const agg = aggConfigs.aggs[0];
      expect(agg.write(aggConfigs)).toMatchInlineSnapshot(`
        Object {
          "params": Object {
            "value": "5s",
          },
        }
      `);
    });
  });
});
