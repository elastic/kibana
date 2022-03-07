/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTopMetricsMetricAgg } from './top_metrics';
import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { IMetricAggConfig } from './metric_agg_type';
import { KBN_FIELD_TYPES } from '../../../../common';

describe('Top metrics metric', () => {
  let aggConfig: IMetricAggConfig;

  const init = ({
    fieldName = 'field',
    fieldType = KBN_FIELD_TYPES.NUMBER,
    sortFieldName = 'sortField',
    sortFieldType = KBN_FIELD_TYPES.NUMBER,
    sortOrder = 'desc',
    size = 1,
  }: any) => {
    const typesRegistry = mockAggTypesRegistry();
    const field = {
      name: fieldName,
      displayName: fieldName,
      type: fieldType,
    };

    const sortField = {
      name: sortFieldName,
      displayName: sortFieldName,
      type: sortFieldType,
    };

    const params = {
      size,
      field: field.name,
      sortField: sortField.name,
      sortOrder: {
        value: sortOrder,
      },
    };

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: (name: string) => {
          if (name === sortFieldName) return sortField;
          if (name === fieldName) return field;
          return null;
        },
        filter: () => [field, sortField],
      },
    } as any;

    const aggConfigs = new AggConfigs(
      indexPattern,
      [
        {
          id: '1',
          type: 'top_metrics',
          schema: 'metric',
          params,
        },
      ],
      { typesRegistry }
    );

    // Grab the aggConfig off the vis (we don't actually use the vis for anything else)
    aggConfig = aggConfigs.aggs[0] as IMetricAggConfig;
  };

  it('should return a label prefixed with Last if sorting in descending order', () => {
    init({ fieldName: 'bytes', sortFieldName: '@timestamp' });
    expect(getTopMetricsMetricAgg().makeLabel(aggConfig)).toEqual(
      'Last "bytes" value by "@timestamp"'
    );
  });

  it('should return a label prefixed with First if sorting in ascending order', () => {
    init({
      fieldName: 'bytes',
      sortFieldName: '@timestamp',
      sortOrder: 'asc',
    });
    expect(getTopMetricsMetricAgg().makeLabel(aggConfig)).toEqual(
      'First "bytes" value by "@timestamp"'
    );
  });

  it('should return a label with size if larger then 1', () => {
    init({
      fieldName: 'bytes',
      sortFieldName: '@timestamp',
      sortOrder: 'asc',
      size: 3,
    });
    expect(getTopMetricsMetricAgg().makeLabel(aggConfig)).toEqual(
      'First 3 "bytes" values by "@timestamp"'
    );
  });

  it('should return a fieldName in getValueBucketPath', () => {
    init({
      fieldName: 'bytes',
      sortFieldName: '@timestamp',
      sortOrder: 'asc',
      size: 3,
    });
    expect(getTopMetricsMetricAgg().getValueBucketPath(aggConfig)).toEqual('1[bytes]');
  });

  it('produces the expected expression ast', () => {
    init({ fieldName: 'machine.os', sortFieldName: '@timestamp' });
    expect(aggConfig.toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "enabled": Array [
                true,
              ],
              "field": Array [
                "machine.os",
              ],
              "id": Array [
                "1",
              ],
              "schema": Array [
                "metric",
              ],
              "size": Array [
                1,
              ],
              "sortField": Array [
                "@timestamp",
              ],
              "sortOrder": Array [
                "desc",
              ],
            },
            "function": "aggTopMetrics",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  describe('gets value from top metrics bucket', () => {
    it('should return null if there is no hits', () => {
      const bucket = {
        '1': {
          top: [],
        },
      };

      init({ fieldName: 'bytes' });
      expect(getTopMetricsMetricAgg().getValue(aggConfig, bucket)).toBe(null);
    });

    it('should return a single value if there is a single hit', () => {
      const bucket = {
        '1': {
          top: [{ sort: [3], metrics: { bytes: 1024 } }],
        },
      };

      init({ fieldName: 'bytes' });
      expect(getTopMetricsMetricAgg().getValue(aggConfig, bucket)).toBe(1024);
    });

    it('should return an array of values if there is a multiple results', () => {
      const bucket = {
        '1': {
          top: [
            { sort: [3], metrics: { bytes: 1024 } },
            { sort: [2], metrics: { bytes: 512 } },
            { sort: [1], metrics: { bytes: 256 } },
          ],
        },
      };

      init({ fieldName: 'bytes' });
      expect(getTopMetricsMetricAgg().getValue(aggConfig, bucket)).toEqual([1024, 512, 256]);
    });
  });
});
