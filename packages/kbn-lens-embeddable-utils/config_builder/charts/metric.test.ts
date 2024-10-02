/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewField, DataViewsContract } from '@kbn/data-views-plugin/common';
import { buildMetric } from './metric';

jest.mock('uuid', () => ({
  v4: jest.fn(() => '3feeaf26-927e-448e-968f-c7e970671564'),
}));

const dataViews: Record<string, DataView> = {
  test: {
    id: 'test',
    fields: {
      getByName: (name: string) => {
        switch (name) {
          case '@timestamp':
            return {
              type: 'datetime',
            } as unknown as DataViewField;
          case 'category':
            return {
              type: 'string',
            } as unknown as DataViewField;
          case 'price':
            return {
              type: 'number',
            } as unknown as DataViewField;
          default:
            return undefined;
        }
      },
    } as any,
  } as unknown as DataView,
};

function mockDataViewsService() {
  return {
    get: jest.fn(async (id: '1' | '2') => {
      const result = {
        ...dataViews[id],
        metaFields: [],
        isPersisted: () => true,
        toSpec: () => ({}),
      };
      return result;
    }),
    create: jest.fn(),
  } as unknown as Pick<DataViewsContract, 'get' | 'create'>;
}

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
      formulaAPI: {} as any,
    }
  );
  expect(result).toMatchInlineSnapshot(`
    Object {
      "references": Array [
        Object {
          "id": "test",
          "name": "indexpattern-datasource-layer-layer_0",
          "type": "index-pattern",
        },
      ],
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
      formulaAPI: {
        insertOrReplaceFormulaColumn: jest.fn(() => ({
          columnOrder: ['formula_accessor_0_0X0', 'formula_accessor_0_0'],
          columns: {
            ['formula_accessor_0_0X0']: {
              label: 'Part of count()',
              dataType: 'number',
              operationType: 'count',
              isBucketed: false,
              scale: 'ratio',
              sourceField: '___records___',
              params: {
                emptyAsNull: false,
              },
              customLabel: true,
            },
            ['formula_accessor_0_0']: {
              label: 'count()',
              customLabel: true,
              operationType: 'formula',
              dataType: 'number',
              references: ['formula_accessor_0_0X0'],
              isBucketed: false,
              timeScale: 's',
              params: {
                formula: 'count()',
                format: {
                  id: 'number',
                  params: {
                    decimals: 0,
                  },
                },
                isFormulaBroken: false,
              },
            },
          },
        })),
      },
    }
  );

  expect(result).toMatchInlineSnapshot(`
    Object {
      "references": Array [
        Object {
          "id": undefined,
          "name": "indexpattern-datasource-layer-layer_0",
          "type": "index-pattern",
        },
        Object {
          "id": undefined,
          "name": "indexpattern-datasource-layer-layer_0_trendline",
          "type": "index-pattern",
        },
      ],
      "state": Object {
        "adHocDataViews": Object {
          "3feeaf26-927e-448e-968f-c7e970671564": Object {},
        },
        "datasourceStates": Object {
          "formBased": Object {
            "layers": Object {
              "layer_0": Object {
                "columnOrder": Array [
                  "formula_accessor_0_0X0",
                  "formula_accessor_0_0",
                ],
                "columns": Object {
                  "formula_accessor_0_0": Object {
                    "customLabel": true,
                    "dataType": "number",
                    "isBucketed": false,
                    "label": "count()",
                    "operationType": "formula",
                    "params": Object {
                      "format": Object {
                        "id": "number",
                        "params": Object {
                          "decimals": 0,
                        },
                      },
                      "formula": "count()",
                      "isFormulaBroken": false,
                    },
                    "references": Array [
                      "formula_accessor_0_0X0",
                    ],
                    "timeScale": "s",
                  },
                  "formula_accessor_0_0X0": Object {
                    "customLabel": true,
                    "dataType": "number",
                    "isBucketed": false,
                    "label": "Part of count()",
                    "operationType": "count",
                    "params": Object {
                      "emptyAsNull": false,
                    },
                    "scale": "ratio",
                    "sourceField": "___records___",
                  },
                },
              },
              "layer_0_trendline": Object {
                "columnOrder": Array [
                  "formula_accessor_0_0X0",
                  "formula_accessor_0_0",
                ],
                "columns": Object {
                  "formula_accessor_0_0": Object {
                    "customLabel": true,
                    "dataType": "number",
                    "isBucketed": false,
                    "label": "count()",
                    "operationType": "formula",
                    "params": Object {
                      "format": Object {
                        "id": "number",
                        "params": Object {
                          "decimals": 0,
                        },
                      },
                      "formula": "count()",
                      "isFormulaBroken": false,
                    },
                    "references": Array [
                      "formula_accessor_0_0X0",
                    ],
                    "timeScale": "s",
                  },
                  "formula_accessor_0_0X0": Object {
                    "customLabel": true,
                    "dataType": "number",
                    "isBucketed": false,
                    "label": "Part of count()",
                    "operationType": "count",
                    "params": Object {
                      "emptyAsNull": false,
                    },
                    "scale": "ratio",
                    "sourceField": "___records___",
                  },
                },
                "linkToLayers": Array [
                  "layer_0",
                ],
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
