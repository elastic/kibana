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

test('shows axis labels, hides the legend, and formats the breakdown column', async () => {
  const result = await buildHeatmap(
    {
      chartType: 'heatmap',
      title: 'latency',
      description: 'distribution',
      dataset: {
        esql: 'from test | stats count = count(latency) by bucket, time',
      },
      value: 'count',
      label: 'Count',
      breakdown: 'bucket',
      breakdownFormat: {
        format: 'duration',
        decimals: 0,
        fromUnit: 'milliseconds',
        toUnit: 'humanizePrecise',
      },
      xAxis: { type: 'dateHistogram', field: 'time' },
      legend: { show: false, position: 'right' },
      xAxisOptions: { showLabels: true, label: 'Time' },
      yAxisOptions: { showLabels: true, sort: 'desc', label: 'Value' },
      colorSteps: [
        { color: '#cce', gte: 0, lt: 50 },
        { color: '#114', gte: 50, lte: 100 },
      ],
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );

  expect(result.description).toBe('distribution');
  expect(result.state.visualization).toMatchObject({
    legend: { isVisible: false, position: 'right' },
    gridConfig: {
      isXAxisLabelVisible: true,
      isYAxisLabelVisible: true,
      isXAxisTitleVisible: false,
      isYAxisTitleVisible: false,
      ySortPredicate: 'desc',
    },
    palette: {
      name: 'custom',
      accessor: 'metric_formula_accessor',
      params: {
        rangeType: 'percent',
        rangeMin: 0,
        rangeMax: 100,
      },
    },
  });
  expect(result.state.datasourceStates.textBased?.layers.layer_0.columns).toEqual([
    {
      columnId: 'y_metric_formula_accessor',
      fieldName: 'bucket',
      label: 'Value',
      customLabel: true,
      meta: { type: 'number' },
      params: {
        format: {
          id: 'duration',
          params: { decimals: 0, fromUnit: 'milliseconds', toUnit: 'humanizePrecise' },
        },
      },
    },
    {
      columnId: 'x_metric_formula_accessor',
      fieldName: 'time',
      label: 'Time',
      customLabel: true,
      meta: { type: 'date' },
    },
    {
      columnId: 'metric_formula_accessor',
      fieldName: 'count',
      label: 'Count',
      customLabel: true,
    },
  ]);
});
