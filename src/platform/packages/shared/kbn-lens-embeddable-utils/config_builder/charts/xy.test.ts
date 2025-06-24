/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField, DataViewsContract } from '@kbn/data-views-plugin/common';
import { buildXY } from './xy';

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

test('generates xy chart config', async () => {
  const result = await buildXY(
    {
      chartType: 'xy',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by @timestamp',
      },
      layers: [
        {
          type: 'series',
          seriesType: 'bar',
          xAxis: '@timestamp',
          yAxis: [
            {
              label: 'test',
              value: 'count',
            },
          ],
        },
      ],
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
                    "columnId": "x_metric_formula_accessor0",
                    "fieldName": "@timestamp",
                  },
                  Object {
                    "columnId": "metric_formula_accessor0_0",
                    "fieldName": "count",
                    "meta": Object {
                      "type": "number",
                    },
                  },
                ],
                "columns": Array [
                  Object {
                    "columnId": "x_metric_formula_accessor0",
                    "fieldName": "@timestamp",
                  },
                  Object {
                    "columnId": "metric_formula_accessor0_0",
                    "fieldName": "count",
                    "meta": Object {
                      "type": "number",
                    },
                  },
                ],
                "index": "test",
                "query": Object {
                  "esql": "from test | count=count() by @timestamp",
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
          "axisTitlesVisibilitySettings": Object {
            "x": true,
            "yLeft": true,
            "yRight": true,
          },
          "emphasizeFitting": true,
          "fittingFunction": "Linear",
          "gridlinesVisibilitySettings": Object {
            "x": true,
            "yLeft": true,
            "yRight": true,
          },
          "hideEndzones": true,
          "labelsOrientation": Object {
            "x": 0,
            "yLeft": 0,
            "yRight": 0,
          },
          "layers": Array [
            Object {
              "accessors": Array [
                "metric_formula_accessor0_0",
              ],
              "layerId": "layer_0",
              "layerType": "data",
              "seriesType": "bar",
              "xAccessor": "x_metric_formula_accessor0",
            },
          ],
          "legend": Object {
            "isVisible": true,
            "position": "left",
          },
          "preferredSeriesType": "line",
          "tickLabelsVisibilitySettings": Object {
            "x": true,
            "yLeft": true,
            "yRight": true,
          },
          "valueLabels": "hide",
          "yLeftExtent": Object {
            "lowerBound": undefined,
            "mode": "full",
            "upperBound": undefined,
          },
        },
      },
      "title": "test",
      "visualizationType": "lnsXY",
    }
  `);
});
