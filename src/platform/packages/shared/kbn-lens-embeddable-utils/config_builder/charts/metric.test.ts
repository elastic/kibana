/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildMetric } from './metric';
import { mockDataViewsService } from './mock_utils';

jest.mock('uuid', () => ({
  v4: jest.fn(() => '3feeaf26-927e-448e-968f-c7e970671564'),
}));
test('generates metric chart config', async () => {
  const result = await buildMetric(
    {
      chartType: 'metric',
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
                    "meta": Object {
                      "type": "number",
                    },
                  },
                ],
                "columns": Array [
                  Object {
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                    "meta": Object {
                      "type": "number",
                    },
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
          "color": undefined,
          "layerId": "layer_0",
          "layerType": "data",
          "metricAccessor": "metric_formula_accessor",
          "showBar": false,
          "subtitle": undefined,
        },
      },
      "title": "test",
      "visualizationType": "lnsMetric",
    }
  `);
});

test('generates metric chart config with trendline', async () => {
  const result = await buildMetric(
    {
      chartType: 'metric',
      title: 'test',
      dataset: {
        index: 'data-view-id',
      },
      value: 'count()',
      trendLine: true,
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
          "3feeaf26-927e-448e-968f-c7e970671564": Object {},
        },
        "datasourceStates": Object {
          "formBased": Object {
            "layers": Object {
              "layer_0": Object {
                "columnOrder": Array [
                  "metric_formula_accessor",
                ],
                "columns": Object {
                  "metric_formula_accessor": Object {
                    "customLabel": true,
                    "dataType": "number",
                    "isBucketed": false,
                    "label": "count()",
                    "operationType": "formula",
                    "params": Object {
                      "format": undefined,
                      "formula": "count()",
                    },
                    "references": Array [],
                    "timeScale": undefined,
                  },
                },
              },
              "layer_0_trendline": Object {
                "columnOrder": Array [
                  "metric_formula_accessor",
                  "x_date_histogram",
                  "metric_formula_accessor_trendline",
                ],
                "columns": Object {
                  "metric_formula_accessor_trendline": Object {
                    "customLabel": true,
                    "dataType": "number",
                    "isBucketed": false,
                    "label": "count()",
                    "operationType": "formula",
                    "params": Object {
                      "format": undefined,
                      "formula": "count()",
                    },
                    "references": Array [],
                    "timeScale": undefined,
                  },
                  "x_date_histogram": Object {
                    "dataType": "date",
                    "isBucketed": true,
                    "label": "@timestamp",
                    "operationType": "date_histogram",
                    "params": Object {
                      "includeEmptyRows": true,
                      "interval": "auto",
                    },
                    "scale": "interval",
                    "sourceField": "@timestamp",
                  },
                },
                "linkToLayers": Array [
                  "layer_0",
                ],
                "sampling": 1,
              },
            },
          },
        },
        "filters": Array [],
        "internalReferences": Array [],
        "query": Object {
          "language": "kuery",
          "query": "",
        },
        "visualization": Object {
          "color": undefined,
          "layerId": "layer_0",
          "layerType": "data",
          "metricAccessor": "metric_formula_accessor",
          "showBar": false,
          "subtitle": undefined,
          "trendlineLayerId": "layer_0_trendline",
          "trendlineLayerType": "metricTrendline",
          "trendlineMetricAccessor": "metric_formula_accessor_trendline",
          "trendlineTimeAccessor": "x_date_histogram",
        },
      },
      "title": "test",
      "visualizationType": "lnsMetric",
    }
  `);
});
