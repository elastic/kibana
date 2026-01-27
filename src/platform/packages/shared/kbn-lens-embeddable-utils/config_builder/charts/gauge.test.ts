/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildGauge } from './gauge';
import { mockDataViewsService } from './mock_utils';

test('generates gauge chart config', async () => {
  const result = await buildGauge(
    {
      chartType: 'gauge',
      title: 'test',
      dataset: {
        esql: 'from test | count=count()',
      },
      value: 'count',
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
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                ],
                "columns": Array [
                  Object {
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                ],
                "index": "test",
                "query": Object {
                  "esql": "from test | count=count()",
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
          "labelMajorMode": "auto",
          "layerId": "layer_0",
          "layerType": "data",
          "metricAccessor": "metric_formula_accessor",
          "shape": "horizontalBullet",
          "ticksPosition": "auto",
        },
      },
      "title": "test",
      "visualizationType": "lnsGauge",
    }
  `);
});

test('generates gauge chart config with goal and max', async () => {
  const result = await buildGauge(
    {
      chartType: 'gauge',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() | eval max=1000 | eval goal=500',
      },
      value: 'count',
      queryMaxValue: 'max',
      queryGoalValue: 'goal',
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
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                  Object {
                    "columnId": "metric_formula_accessor_max",
                    "fieldName": "max",
                  },
                  Object {
                    "columnId": "metric_formula_accessor_goal",
                    "fieldName": "goal",
                  },
                ],
                "columns": Array [
                  Object {
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                  Object {
                    "columnId": "metric_formula_accessor_max",
                    "fieldName": "max",
                  },
                  Object {
                    "columnId": "metric_formula_accessor_goal",
                    "fieldName": "goal",
                  },
                ],
                "index": "test",
                "query": Object {
                  "esql": "from test | count=count() | eval max=1000 | eval goal=500",
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
          "goalAccessor": "metric_formula_accessor_goal",
          "labelMajorMode": "auto",
          "layerId": "layer_0",
          "layerType": "data",
          "maxAccessor": "metric_formula_accessor_max",
          "metricAccessor": "metric_formula_accessor",
          "shape": "horizontalBullet",
          "showBar": true,
          "ticksPosition": "auto",
        },
      },
      "title": "test",
      "visualizationType": "lnsGauge",
    }
  `);
});
