/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
              "extendToTimeRange": undefined,
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
        timeRange: {
          from: 'from',
          to: 'to',
          type: 'timerange',
        },
        useNormalizedEsInterval: true,
        scaleMetricValues: true,
        interval: 'interval',
        time_zone: 'time_zone',
        drop_partials: false,
        format: 'format',
        min_doc_count: 1,
        extended_bounds: {
          type: 'extended_bounds',
          min: 1,
          max: 2,
        },
      });

      expect(actual.value).toMatchInlineSnapshot(`
        Object {
          "enabled": true,
          "id": undefined,
          "params": Object {
            "customLabel": undefined,
            "drop_partials": false,
            "extendToTimeRange": undefined,
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

      expect(actual.value.params.json).toEqual('{ "foo": true }');
    });
  });
});
