/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildXY } from './xy';
import { mockDataViewsService } from './mock_utils';
import type { XYState } from '@kbn/lens-plugin/public';

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
              "yConfig": Array [
                Object {
                  "color": undefined,
                  "forAccessor": "metric_formula_accessor0_0",
                },
              ],
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

test('it generates xy chart with multiple reference lines', async () => {
  const result = await buildXY(
    {
      chartType: 'xy',
      title: 'test',
      dataset: {
        index: '1',
        timeFieldName: '@timestamp',
      },
      layers: [
        {
          type: 'series',
          seriesType: 'bar',
          xAxis: {
            type: 'dateHistogram',
            field: '@timestamp',
          },
          yAxis: [
            {
              label: 'test',
              value: 'count()',
            },
          ],
        },
        {
          type: 'reference',
          yAxis: [
            {
              seriesColor: 'red',
              lineThickness: 2,
              fill: 'above',
              value: '123',
            },
            {
              seriesColor: 'blue',
              lineThickness: 2,
              fill: 'below',
              value: '142',
            },
          ],
        },
        {
          type: 'reference',
          yAxis: [
            {
              seriesColor: 'yellow',
              fill: 'none',
              value: '100',
            },
          ],
        },
      ],
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );

  const xyState = result.state.visualization as XYState;

  expect(xyState.layers).toHaveLength(3);

  const [_, referenceLayer1, referenceLayer2] = xyState.layers;

  expect(referenceLayer1).toEqual({
    layerId: 'layer_1',
    layerType: 'referenceLine',
    accessors: ['metric_formula_accessor1_0', 'metric_formula_accessor1_1'],
    yConfig: [
      {
        axisMode: 'left',
        color: 'red',
        fill: 'above',
        forAccessor: 'metric_formula_accessor1_0',
        lineWidth: 2,
      },
      {
        axisMode: 'left',
        color: 'blue',
        fill: 'below',
        forAccessor: 'metric_formula_accessor1_1',
        lineWidth: 2,
      },
    ],
  });

  expect(referenceLayer2).toEqual({
    layerId: 'layer_2',
    layerType: 'referenceLine',
    accessors: ['metric_formula_accessor2_0'],
    yConfig: [
      {
        axisMode: 'left',
        color: 'yellow',
        fill: 'none',
        forAccessor: 'metric_formula_accessor2_0',
      },
    ],
  });
});
