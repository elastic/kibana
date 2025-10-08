/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromAPItoLensState, fromLensStateToAPI } from './metric';
import type { MetricState } from '../../schema';

describe('metric chart transformations', () => {
  describe('roundtrip conversion', () => {
    it('basic metric chart', async () => {
      const basicMetricConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric',
        description: 'A test metric chart',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          label: 'Count of documents',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: false,
          empty_as_null: false,
        },
        sampling: 1,
        ignore_global_filters: false,
      };

      // Convert API config to Lens state
      const lensState = await fromAPItoLensState(basicMetricConfig);

      // Convert back from Lens state to API config
      const convertedConfig = fromLensStateToAPI(lensState);

      // Verify the result has the same type as the input
      expect(convertedConfig.type).toBe(basicMetricConfig.type);
      expect(convertedConfig).toHaveProperty('metric');
      expect(convertedConfig).toHaveProperty('dataset');
      expect(convertedConfig).toHaveProperty('title');
    });

    it('chart with secondary metric', async () => {
      const metricWithSecondaryConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric with Secondary',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'average',
          field: 'price',
          label: 'Average Price',
          alignments: {
            labels: 'center',
            value: 'right',
          },
          fit: true,
          color: {
            type: 'static',
            color: '#FF0000',
          },
        },
        secondary_metric: {
          operation: 'sum',
          field: 'quantity',
          label: 'Total Quantity',
          prefix: 'Total: ',
          empty_as_null: false,
        },
        sampling: 0.5,
        ignore_global_filters: true,
      };

      // Convert API config to Lens state
      const lensState = await fromAPItoLensState(metricWithSecondaryConfig);

      // Convert back from Lens state to API config
      const convertedConfig = fromLensStateToAPI(lensState);

      // Verify the result has the same type as the input
      expect(convertedConfig.type).toBe(metricWithSecondaryConfig.type);
      expect(convertedConfig).toHaveProperty('metric');
      expect(convertedConfig).toHaveProperty('secondary_metric');
      expect(convertedConfig).toHaveProperty('dataset');
      expect(convertedConfig).toHaveProperty('title');
    });

    it('metric chart with breakdown', async () => {
      const metricWithBreakdownConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric with Breakdown',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'sum',
          field: 'revenue',
          label: 'Total Revenue',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: false,
          icon: {
            name: 'dollar',
            align: 'left',
          },
          empty_as_null: false,
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['category'],
          columns: 3,
          size: 5,
          collapse_by: 'sum',
        },
        sampling: 1,
        ignore_global_filters: false,
      };

      // Convert API config to Lens state
      const lensState = await fromAPItoLensState(metricWithBreakdownConfig);

      // Convert back from Lens state to API config
      const convertedConfig = fromLensStateToAPI(lensState);

      // Verify the result has the same type as the input
      expect(convertedConfig.type).toBe(metricWithBreakdownConfig.type);
      expect(convertedConfig).toHaveProperty('metric');
      expect(convertedConfig).toHaveProperty('breakdown_by');
      expect(convertedConfig).toHaveProperty('dataset');
      expect(convertedConfig).toHaveProperty('title');
    });

    it('metric chart with background chart (bar)', async () => {
      const metricWithBarConfig: MetricState = {
        type: 'metric',
        title: 'Test Metric with Bar Background',
        dataset: {
          type: 'index',
          index: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          label: 'Document Count',
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: false,
          background_chart: {
            type: 'bar',
            direction: 'horizontal',
            goal_value: {
              operation: 'max',
              field: 'max_value',
            },
          },
          empty_as_null: false,
        },
        sampling: 1,
        ignore_global_filters: false,
      };

      // Convert API config to Lens state
      const lensState = await fromAPItoLensState(metricWithBarConfig);

      // Convert back from Lens state to API config
      const convertedConfig = fromLensStateToAPI(lensState);

      // Verify the result has the same type as the input
      expect(convertedConfig.type).toBe(metricWithBarConfig.type);
      expect(convertedConfig).toHaveProperty('metric');
      expect(convertedConfig.metric).toHaveProperty('background_chart');
      expect(convertedConfig).toHaveProperty('dataset');
      expect(convertedConfig).toHaveProperty('title');
    });

    it('ESQL-based metric chart', async () => {
      const esqlMetricConfig: MetricState = {
        type: 'metric',
        title: 'Test ESQL Metric',
        description: 'A test metric chart using ESQL',
        dataset: {
          type: 'esql',
          query: 'FROM test-index | STATS count = COUNT(*)',
        },
        metric: {
          operation: 'value',
          column: 'count',
          // label: 'Count',
          // show_array_values: false,
          alignments: {
            labels: 'left',
            value: 'left',
          },
          fit: true,
          //   background_chart: {
          //     type: 'bar',
          //     goal_value: {
          //       operation: 'value',
          //       column: 'max_count',
          //     },
          //   },
        },
        sampling: 1,
        ignore_global_filters: true,
      };

      // Convert API config to Lens state
      const lensState = await fromAPItoLensState(esqlMetricConfig);

      // Convert back from Lens state to API config
      const convertedConfig = fromLensStateToAPI(lensState);

      // Verify the result has the same type as the input
      expect(convertedConfig.type).toBe(esqlMetricConfig.type);
      expect(convertedConfig).toHaveProperty('metric');
      expect(convertedConfig).toHaveProperty('dataset');
      expect(convertedConfig).toHaveProperty('title');
      expect(lensState).toHaveProperty('references');
      expect(lensState.references).toHaveLength(1);

      const referenceId = lensState.references[0].id;

      expect(lensState).toMatchInlineSnapshot(`
        Object {
          "description": "A test metric chart using ESQL",
          "references": Array [
            Object {
              "id": "${referenceId}",
              "name": "indexpattern-datasource-layer-layer_0",
              "type": "index-pattern",
            },
          ],
          "state": Object {
            "adHocDataViews": Object {},
            "datasourceStates": Object {
              "textBased": Object {
                "layers": Object {
                  "layer_0": Object {
                    "columns": Array [
                      Object {
                        "columnId": "metric_formula_accessor",
                        "fieldName": "count",
                        "meta": Object {
                          "type": "number",
                        },
                      },
                    ],
                    "index": "test-index",
                    "query": Object {
                      "esql": "FROM test-index | STATS count = COUNT(*)",
                    },
                    "timeField": "@timestamp",
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
              "layerId": "layer_0",
              "layerType": "data",
              "metricAccessor": "metric_formula_accessor",
              "showBar": false,
              "subtitle": "",
              "titlesTextAlign": "left",
              "valueFontMode": "fit",
              "valuesTextAlign": "left",
            },
          },
          "title": "Test ESQL Metric",
          "visualizationType": "lnsMetric",
        }
      `);

      expect(convertedConfig).toMatchInlineSnapshot(`
        Object {
          "dataset": Object {
            "query": "FROM test-index | STATS count = COUNT(*)",
            "type": "esql",
          },
          "description": "A test metric chart using ESQL",
          "ignore_global_filters": true,
          "metric": Object {
            "alignments": Object {
              "labels": "left",
              "value": "left",
            },
            "column": "count",
            "fit": true,
            "operation": "value",
          },
          "sampling": 1,
          "title": "Test ESQL Metric",
          "type": "metric",
        }
      `);

      expect(convertedConfig).toEqual(esqlMetricConfig);
    });

    it('comprehensive metric chart', async () => {
      const comprehensiveMetricConfig: MetricState = {
        type: 'metric',
        title: 'Comprehensive Test Metric',
        description: 'A comprehensive metric chart with all features',
        dataset: {
          type: 'index',
          index: 'comprehensive-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'average',
          field: 'response_time',
          label: 'Avg Response Time',
          sub_label: 'milliseconds',
          alignments: {
            labels: 'center',
            value: 'right',
          },
          fit: true,
          icon: {
            name: 'clock',
            align: 'right',
          },
          color: {
            type: 'static',
            color: '#00FF00',
          },
          background_chart: {
            type: 'trend',
          },
        },
        secondary_metric: {
          operation: 'count',
          label: 'Request Count',
          prefix: 'Requests: ',
          color: {
            type: 'static',
            color: '#0000FF',
          },
          empty_as_null: false,
        },
        breakdown_by: {
          operation: 'terms',
          fields: ['service_name'],
          columns: 5,
          size: 10,
        },
        sampling: 0.8,
        ignore_global_filters: true,
      };

      // Convert API config to Lens state
      const lensState = await fromAPItoLensState(comprehensiveMetricConfig);

      // Convert back from Lens state to API config
      const convertedConfig = fromLensStateToAPI(lensState);

      // Verify the result has the same type as the input
      expect(convertedConfig.type).toBe(comprehensiveMetricConfig.type);
      expect(convertedConfig).toHaveProperty('metric');
      expect(convertedConfig).toHaveProperty('secondary_metric');
      expect(convertedConfig).toHaveProperty('breakdown_by');
      expect(convertedConfig).toHaveProperty('dataset');
      expect(convertedConfig).toHaveProperty('title');

      expect(lensState).toHaveProperty('references');
      expect(lensState.references).toHaveLength(1);

      const referenceId = lensState.references[0].id;

      expect(lensState).toMatchInlineSnapshot(`
        Object {
          "description": "A comprehensive metric chart with all features",
          "references": Array [
            Object {
              "id": "${referenceId}",
              "name": "indexpattern-datasource-layer-layer_0",
              "type": "index-pattern",
            },
          ],
          "state": Object {
            "adHocDataViews": Object {
              "${referenceId}": Object {
                "allowHidden": false,
                "allowNoIndex": false,
                "fieldAttrs": Object {},
                "fieldFormats": Object {},
                "id": "${referenceId}",
                "name": "comprehensive-index",
                "runtimeFieldMap": Object {},
                "sourceFilters": Array [],
                "timeFieldName": "@timestamp",
                "title": "comprehensive-index",
              },
            },
            "datasourceStates": Object {
              "formBased": Object {
                "layers": Object {
                  "layer_0": Object {
                    "columnOrder": Array [
                      "metric_formula_accessor_breakdown",
                      "metric_formula_accessor",
                      "metric_formula_accessor_secondary",
                    ],
                    "columns": Object {
                      "metric_formula_accessor": Object {
                        "customLabel": true,
                        "dataType": "number",
                        "filter": undefined,
                        "isBucketed": false,
                        "label": "Avg Response Time",
                        "operationType": "average",
                        "params": Object {},
                        "sourceField": "response_time",
                      },
                      "metric_formula_accessor_breakdown": Object {
                        "customLabel": false,
                        "dataType": "string",
                        "isBucketed": true,
                        "label": "",
                        "operationType": "terms",
                        "params": Object {
                          "accuracyMode": false,
                          "exclude": Array [],
                          "excludeIsRegex": false,
                          "format": undefined,
                          "include": Array [],
                          "includeIsRegex": false,
                          "missingBucket": undefined,
                          "orderAgg": undefined,
                          "orderBy": Object {
                            "fallback": true,
                            "type": "alphabetical",
                          },
                          "orderDirection": "asc",
                          "otherBucket": false,
                          "parentFormat": Object {
                            "id": "terms",
                          },
                          "secondaryFields": Array [],
                          "size": 10,
                        },
                        "sourceField": "service_name",
                      },
                      "metric_formula_accessor_secondary": Object {
                        "customLabel": true,
                        "dataType": "number",
                        "filter": undefined,
                        "isBucketed": false,
                        "label": "Request Count",
                        "operationType": "count",
                        "params": Object {
                          "emptyAsNull": false,
                        },
                        "sourceField": "___records___",
                      },
                    },
                    "ignoreGlobalFilters": true,
                    "sampling": 0.8,
                  },
                  "layer_0_trendline": Object {
                    "columnOrder": Array [
                      "metric_formula_accessor_breakdown_trendline",
                      "metric_formula_accessor_trendline",
                      "metric_formula_accessor_secondary_trendlineX0",
                    ],
                    "columns": Object {
                      "metric_formula_accessor_breakdown_trendline": Object {
                        "customLabel": false,
                        "dataType": "string",
                        "isBucketed": true,
                        "label": "",
                        "operationType": "terms",
                        "params": Object {
                          "accuracyMode": false,
                          "exclude": Array [],
                          "excludeIsRegex": false,
                          "format": undefined,
                          "include": Array [],
                          "includeIsRegex": false,
                          "missingBucket": undefined,
                          "orderAgg": undefined,
                          "orderBy": Object {
                            "fallback": true,
                            "type": "alphabetical",
                          },
                          "orderDirection": "asc",
                          "otherBucket": false,
                          "parentFormat": Object {
                            "id": "terms",
                          },
                          "secondaryFields": Array [],
                          "size": 10,
                        },
                        "sourceField": "service_name",
                      },
                      "metric_formula_accessor_secondary_trendlineX0": Object {
                        "customLabel": true,
                        "dataType": "number",
                        "filter": undefined,
                        "isBucketed": false,
                        "label": "Request Count",
                        "operationType": "count",
                        "params": Object {
                          "emptyAsNull": false,
                        },
                        "sourceField": "___records___",
                      },
                      "metric_formula_accessor_trendline": Object {
                        "customLabel": true,
                        "dataType": "number",
                        "filter": undefined,
                        "isBucketed": false,
                        "label": "Avg Response Time",
                        "operationType": "average",
                        "params": Object {},
                        "sourceField": "response_time",
                      },
                    },
                    "ignoreGlobalFilters": true,
                    "sampling": 0.8,
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
              "breakdownByAccessor": "metric_formula_accessor_breakdown",
              "color": "#00FF00",
              "icon": "clock",
              "iconAlign": "right",
              "layerId": "layer_0",
              "layerType": "data",
              "maxCols": 5,
              "metricAccessor": "metric_formula_accessor",
              "secondaryAlign": "right",
              "secondaryMetricAccessor": "metric_formula_accessor_secondary",
              "secondaryPrefix": "Requests: ",
              "showBar": false,
              "subtitle": "milliseconds",
              "titlesTextAlign": "center",
              "trendlineBreakdownByAccessor": "metric_formula_accessor_breakdown_trendline",
              "trendlineLayerId": "layer_0_trendline",
              "trendlineLayerType": "metricTrendline",
              "trendlineMetricAccessor": "metric_formula_accessor_trendline",
              "trendlineSecondaryMetricAccessor": "metric_formula_accessor_secondary_trendline",
              "trendlineTimeAccessor": "x_date_histogram",
              "valueFontMode": "fit",
              "valuesTextAlign": "right",
            },
          },
          "title": "Comprehensive Test Metric",
          "visualizationType": "lnsMetric",
        }
      `);
      expect(convertedConfig).toMatchInlineSnapshot(`
        Object {
          "breakdown_by": Object {
            "excludes": Object {
              "as_regex": false,
              "values": Array [],
            },
            "fields": Array [
              "service_name",
            ],
            "includes": Object {
              "as_regex": false,
              "values": Array [],
            },
            "increase_accuracy": false,
            "label": undefined,
            "operation": "terms",
            "other_bucket": Object {
              "include_documents_without_field": false,
            },
            "rank_by": Object {
              "direction": "asc",
              "type": "alphabetical",
            },
            "size": 10,
          },
          "dataset": Object {
            "name": undefined,
            "type": "dataView",
          },
          "description": "A comprehensive metric chart with all features",
          "ignore_global_filters": true,
          "metric": Object {
            "alignments": Object {
              "labels": "center",
              "value": "right",
            },
            "background_chart": Object {},
            "color": Object {
              "color": "#00FF00",
              "type": "static",
            },
            "field": "response_time",
            "fit": true,
            "icon": Object {
              "align": "right",
              "name": "clock",
            },
            "label": "Avg Response Time",
            "operation": "average",
            "sub_label": "milliseconds",
          },
          "sampling": 0.8,
          "secondary_metric": Object {
            "empty_as_null": false,
            "label": "Request Count",
            "operation": "count",
            "prefix": "Requests: ",
          },
          "title": "Comprehensive Test Metric",
          "type": "metric",
        }
      `);
    });
  });
});
