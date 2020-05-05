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

import { functionWrapper } from '../test_helpers';
import { aggDateHistogram } from './date_histogram_fn';

describe('agg_expression_functions', () => {
  describe('aggDateHistogram', () => {
    const fn = functionWrapper(aggDateHistogram());

    test('fills in defaults when only required args are provided', () => {
      const actual = fn({});
      expect(actual).toMatchInlineSnapshot(`
        Object {
          "type": "agg_type",
          "value": Object {
            "enabled": true,
            "id": undefined,
            "params": Object {
              "customLabel": undefined,
              "drop_partials": undefined,
              "extended_bounds": undefined,
              "field": undefined,
              "format": undefined,
              "interval": undefined,
              "json": undefined,
              "min_doc_count": undefined,
              "scaleMetricValues": undefined,
              "timeRange": undefined,
              "time_zone": undefined,
              "useNormalizedEsInterval": undefined,
            },
            "schema": undefined,
            "type": "date_histogram",
          },
        }
      `);
    });

    test('includes optional params when they are provided', () => {
      const actual = fn({
        field: 'field',
        timeRange: JSON.stringify({
          from: 'from',
          to: 'to',
        }),
        useNormalizedEsInterval: true,
        scaleMetricValues: true,
        interval: 'interval',
        time_zone: 'time_zone',
        drop_partials: false,
        format: 'format',
        min_doc_count: 1,
        extended_bounds: JSON.stringify({
          min: 1,
          max: 2,
        }),
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "drop_partials": false,
            "extended_bounds": Object {
              "max": 2,
              "min": 1,
            },
            "field": "field",
            "format": "format",
            "interval": "interval",
            "json": undefined,
            "min_doc_count": 1,
            "scaleMetricValues": true,
            "timeRange": Object {
              "from": "from",
              "to": "to",
            },
            "time_zone": "time_zone",
            "useNormalizedEsInterval": true,
          },
          "schema": undefined,
          "type": "date_histogram",
        }
      `);
    });

    test('correctly parses json string argument', () => {
      const actual = fn({
        json: '{ "foo": true }',
      });

      expect(actual.value.params.json).toEqual({ foo: true });

      expect(() => {
        fn({
          json: '/// intentionally malformed json ///',
        });
      }).toThrowErrorMatchingInlineSnapshot(`"Unable to parse json argument string"`);
    });
  });
});
