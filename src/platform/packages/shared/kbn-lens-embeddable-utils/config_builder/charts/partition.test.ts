/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPartitionChart } from './partition';
import { mockDataViewsService } from './mock_utils';

test('generates metric chart config', async () => {
  const result = await buildPartitionChart(
    {
      chartType: 'treemap',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by @timestamp, category',
      },
      value: 'count',
      breakdown: ['@timestamp', 'category'],
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );
  expect(result).toMatchInlineSnapshot(`
    Object {
      "references": Array [],
      "state": Object {
        "adHocDataViews": Object {
          "test": Object {},
        },
        "datasourceStates": Object {
          "textBased": Object {
            "layers": Object {
              "layer_0": Object {
                "allColumns": Array [
                  Object {
                    "columnId": "metric_formula_accessor_breakdown_0",
                    "fieldName": "@timestamp",
                  },
                  Object {
                    "columnId": "metric_formula_accessor_breakdown_1",
                    "fieldName": "category",
                  },
                  Object {
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                ],
                "columns": Array [
                  Object {
                    "columnId": "metric_formula_accessor_breakdown_0",
                    "fieldName": "@timestamp",
                  },
                  Object {
                    "columnId": "metric_formula_accessor_breakdown_1",
                    "fieldName": "category",
                  },
                  Object {
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                ],
                "index": "test",
                "query": Object {
                  "esql": "from test | count=count() by @timestamp, category",
                },
                "timeField": undefined,
              },
            },
          },
        },
        "filters": Array [],
        "internalReferences": Array [
          Object {
            "id": "test",
            "name": "indexpattern-datasource-layer-layer_0",
            "type": "index-pattern",
          },
        ],
        "query": Object {
          "language": "kuery",
          "query": "",
        },
        "visualization": Object {
          "layers": Array [
            Object {
              "allowMultipleMetrics": false,
              "categoryDisplay": "default",
              "layerId": "layer_0",
              "layerType": "data",
              "legendDisplay": "default",
              "legendPosition": "right",
              "metrics": Array [
                "metric_formula_accessor",
              ],
              "numberDisplay": "percent",
              "primaryGroups": Array [
                "metric_formula_accessor_breakdown_0",
                "metric_formula_accessor_breakdown_1",
              ],
            },
          ],
          "shape": "treemap",
        },
      },
      "title": "test",
      "visualizationType": "lnsPie",
    }
  `);
});
