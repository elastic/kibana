/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField, DataViewsContract } from '@kbn/data-views-plugin/common';
import { buildHeatmap } from './heatmap';

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
  const result = await buildHeatmap(
    {
      chartType: 'heatmap',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by @timestamp, category',
      },
      breakdown: 'category',
      xAxis: '@timestamp',
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
                    "columnId": "y_metric_formula_accessor",
                    "fieldName": "category",
                  },
                  Object {
                    "columnId": "x_metric_formula_accessor",
                    "fieldName": "@timestamp",
                  },
                  Object {
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                ],
                "columns": Array [
                  Object {
                    "columnId": "y_metric_formula_accessor",
                    "fieldName": "category",
                  },
                  Object {
                    "columnId": "x_metric_formula_accessor",
                    "fieldName": "@timestamp",
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
        "internalReferences": Array [],
        "query": Object {
          "language": "kuery",
          "query": "",
        },
        "visualization": Object {
          "gridConfig": Object {
            "isCellLabelVisible": false,
            "isXAxisLabelVisible": false,
            "isXAxisTitleVisible": false,
            "isYAxisLabelVisible": false,
            "isYAxisTitleVisible": false,
            "type": "heatmap_grid",
          },
          "layerId": "layer_0",
          "layerType": "data",
          "legend": Object {
            "isVisible": true,
            "position": "left",
            "type": "heatmap_legend",
          },
          "shape": "heatmap",
          "valueAccessor": "metric_formula_accessor",
          "xAccessor": "x_metric_formula_accessor",
          "yAccessor": "y_metric_formula_accessor",
        },
      },
      "title": "test",
      "visualizationType": "lnsHeatmap",
    }
  `);
});
