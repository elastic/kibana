/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildHeatmap } from './heatmap';
import { mockDataViewsService } from './mock_utils';

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

test('hides the legend when configured', async () => {
  const { state } = await buildHeatmap(
    {
      chartType: 'heatmap',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by @timestamp, category',
      },
      breakdown: 'category',
      xAxis: '@timestamp',
      value: 'count',
      legend: { show: false },
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );

  expect(state.visualization).toEqual(
    expect.objectContaining({
      legend: expect.objectContaining({ isVisible: false }),
    })
  );
});

test('writes a custom percent palette when cell colors are provided', async () => {
  const { state } = await buildHeatmap(
    {
      chartType: 'heatmap',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by @timestamp, category',
      },
      breakdown: 'category',
      xAxis: '@timestamp',
      value: 'count',
      color: {
        type: 'dynamic',
        range: 'percentage',
        steps: [
          { color: '#d6e8f5', gte: 0, lt: 100 / 3 },
          { color: '#8ec4ea', gte: 100 / 3, lt: 200 / 3 },
          { color: '#1ba9f5', gte: 200 / 3, lte: 100 },
        ],
      },
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );

  expect(state.visualization).toEqual(
    expect.objectContaining({
      palette: {
        type: 'palette',
        name: 'custom',
        accessor: 'metric_formula_accessor',
        params: {
          name: 'custom',
          reverse: false,
          rangeType: 'percent',
          rangeMin: 0,
          rangeMax: 100,
          continuity: 'none',
          stops: [
            { color: '#d6e8f5', stop: 100 / 3 },
            { color: '#8ec4ea', stop: 200 / 3 },
            { color: '#1ba9f5', stop: 100 },
          ],
          colorStops: [
            { color: '#d6e8f5', stop: 0 },
            { color: '#8ec4ea', stop: 100 / 3 },
            { color: '#1ba9f5', stop: 200 / 3 },
          ],
        },
      },
    })
  );
});

test('keeps the default palette when color is auto', async () => {
  const { state } = await buildHeatmap(
    {
      chartType: 'heatmap',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by @timestamp, category',
      },
      breakdown: 'category',
      xAxis: '@timestamp',
      value: 'count',
      color: { type: 'auto' },
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );

  expect(state.visualization).not.toHaveProperty('palette');
});

test('sorts the vertical axis when configured', async () => {
  const { state } = await buildHeatmap(
    {
      chartType: 'heatmap',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by @timestamp, category',
      },
      breakdown: 'category',
      xAxis: '@timestamp',
      value: 'count',
      ySort: 'asc',
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );

  expect(state.visualization).toEqual(
    expect.objectContaining({
      gridConfig: expect.objectContaining({
        ySortPredicate: 'asc',
      }),
    })
  );
});

test('shows axis labels when configured', async () => {
  const { state } = await buildHeatmap(
    {
      chartType: 'heatmap',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by @timestamp, category',
      },
      breakdown: 'category',
      xAxis: '@timestamp',
      value: 'count',
      axisLabel: { xAxis: true, yAxis: true },
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );

  expect(state.visualization).toEqual(
    expect.objectContaining({
      gridConfig: expect.objectContaining({
        isXAxisLabelVisible: true,
        isXAxisTitleVisible: false,
        isYAxisLabelVisible: true,
        isYAxisTitleVisible: false,
      }),
    })
  );
});
