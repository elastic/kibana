/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLQueryColumns } from '@kbn/esql-utils';
import {
  LensConfigBuilder,
  LensDataset,
  type LensConfig,
  type LensGaugeConfig,
  type LensHeatmapConfig,
  type LensMetricConfig,
  type LensMosaicConfig,
  type LensPieConfig,
  type LensRegionMapConfig,
  type LensTableConfig,
  type LensTagCloudConfig,
  type LensTreeMapConfig,
  type LensXYConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { useEffect } from 'react';
import { DashboardApi } from '../../dashboard_api/types';
import { dataService, observabilityAssistantService } from '../../services/kibana_services';

const chartTypes = [
  'xy',
  'pie',
  'heatmap',
  'metric',
  'gauge',
  'donut',
  'mosaic',
  'regionmap',
  'table',
  'tagcloud',
  'treemap',
] as const;

export function useObservabilityAIAssistantContext({
  dashboardApi,
}: {
  dashboardApi: DashboardApi | undefined;
}) {
  useEffect(() => {
    if (!observabilityAssistantService) {
      return;
    }

    const {
      service: { setScreenContext },
      createScreenContextAction,
    } = observabilityAssistantService;

    return setScreenContext({
      screenDescription:
        'The user is looking at the dashboard app. Here they can add visualizations to a dashboard and save them',
      actions: dashboardApi
        ? [
            createScreenContextAction(
              {
                name: 'add_to_dashboard',
                description:
                  'Add an ES|QL visualization to the current dashboard. Pick a single chart type, and based on the chart type, the corresponding key for `layers`. E.g., when you select type:metric, fill in only layers.metric.',
                parameters: {
                  type: 'object',
                  properties: {
                    esql: {
                      type: 'object',
                      properties: {
                        query: {
                          type: 'string',
                          description:
                            'The ES|QL query for this visualization. Use the "query" function to generate ES|QL first and then add it here.',
                        },
                      },
                      required: ['query'],
                    },
                    type: {
                      type: 'string',
                      description: 'The type of chart',
                      enum: chartTypes,
                    },
                    layers: {
                      type: 'object',
                      properties: {
                        xy: {
                          type: 'object',
                          properties: {
                            xAxis: {
                              type: 'string',
                            },
                            yAxis: {
                              type: 'string',
                            },
                            type: {
                              type: 'string',
                              enum: ['line', 'bar', 'area'],
                            },
                          },
                        },
                        donut: {
                          type: 'object',
                          properties: {
                            breakdown: {
                              type: 'string',
                            },
                          },
                        },
                        metric: {
                          type: 'object',
                        },
                        gauge: {
                          type: 'object',
                        },
                        pie: {
                          type: 'object',
                          properties: {
                            breakdown: {
                              type: 'string',
                            },
                          },
                        },
                        heatmap: {
                          type: 'object',
                          properties: {
                            xAxis: {
                              type: 'string',
                            },
                            breakdown: {
                              type: 'string',
                            },
                          },
                          required: ['xAxis'],
                        },
                        mosaic: {
                          type: 'object',
                          properties: {
                            breakdown: {
                              type: 'string',
                            },
                          },
                          required: ['breakdown'],
                        },
                        regionmap: {
                          type: 'object',
                          properties: {
                            breakdown: {
                              type: 'string',
                            },
                          },
                          required: ['breakdown'],
                        },
                        table: {
                          type: 'object',
                        },
                        tagcloud: {
                          type: 'object',
                          properties: {
                            breakdown: {
                              type: 'string',
                            },
                          },
                          required: ['breakdown'],
                        },
                        treemap: {
                          type: 'object',
                          properties: {
                            breakdown: {
                              type: 'string',
                            },
                          },
                        },
                      },
                    },
                    title: {
                      type: 'string',
                      description: 'An optional title for the visualization.',
                    },
                  },
                  required: ['esql', 'type'],
                } as const,
              },
              async ({ args, signal }) => {
                const {
                  title = '',
                  type: chartType = 'xy',
                  layers,
                  esql: { query },
                } = args;

                const [columns] = await Promise.all([
                  getESQLQueryColumns({
                    esqlQuery: query,
                    search: dataService.search.search,
                    signal,
                  }),
                ]);

                const configBuilder = new LensConfigBuilder(dataService.dataViews);

                let config: LensConfig;

                const firstMetricColumn = columns.find(
                  (column) => column.meta.type === 'number'
                )?.id;

                const dataset: LensDataset = {
                  esql: query,
                };

                switch (chartType) {
                  default:
                  case 'xy':
                    const xyConfig: LensXYConfig = {
                      chartType: 'xy',
                      layers: [
                        {
                          seriesType: layers?.xy?.type || 'line',
                          type: 'series',
                          xAxis: layers?.xy?.xAxis || '@timestamp',
                          yAxis: [
                            {
                              value: layers?.xy?.yAxis || firstMetricColumn!,
                            },
                          ],
                        },
                      ],
                      dataset,
                      title,
                    };
                    config = xyConfig;
                    break;

                  case 'donut':
                    const donutConfig: LensPieConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      breakdown: [layers?.donut?.breakdown!],
                      dataset,
                    };
                    config = donutConfig;
                    break;

                  case 'pie':
                    const pieConfig: LensPieConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      breakdown: [layers?.pie?.breakdown!],
                      dataset,
                    };
                    config = pieConfig;
                    break;

                  case 'metric':
                    const metricConfig: LensMetricConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      dataset,
                    };
                    config = metricConfig;
                    break;

                  case 'gauge':
                    const gaugeConfig: LensGaugeConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      dataset,
                    };
                    config = gaugeConfig;

                    break;

                  case 'heatmap':
                    const heatmapConfig: LensHeatmapConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      breakdown: layers?.heatmap?.breakdown,
                      xAxis: layers?.heatmap?.xAxis || '@timestamp',
                      dataset,
                    };
                    config = heatmapConfig;
                    break;

                  case 'mosaic':
                    const mosaicConfig: LensMosaicConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      breakdown: [layers?.mosaic?.breakdown || '@timestamp'],
                      dataset,
                    };
                    config = mosaicConfig;
                    break;

                  case 'regionmap':
                    const regionMapConfig: LensRegionMapConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      breakdown: layers?.regionmap?.breakdown!,
                      dataset,
                    };
                    config = regionMapConfig;
                    break;

                  case 'table':
                    const tableConfig: LensTableConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      dataset,
                    };
                    config = tableConfig;
                    break;

                  case 'tagcloud':
                    const tagCloudConfig: LensTagCloudConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      breakdown: layers?.tagcloud?.breakdown!,
                      dataset,
                    };
                    config = tagCloudConfig;
                    break;

                  case 'treemap':
                    const treeMapConfig: LensTreeMapConfig = {
                      chartType,
                      title,
                      value: firstMetricColumn!,
                      breakdown: [layers?.treemap?.breakdown || '@timestamp'],
                      dataset,
                    };
                    config = treeMapConfig;
                    break;
                }

                const embeddableInput = (await configBuilder.build(config, {
                  embeddable: true,
                  query: dataset,
                })) as LensEmbeddableInput;

                return dashboardApi
                  .addNewPanel({
                    panelType: 'lens',
                    initialState: embeddableInput,
                  })
                  .then(() => {
                    return {
                      content: 'Visualization successfully added to dashboard',
                    };
                  })
                  .catch((error) => {
                    return {
                      content: {
                        error,
                      },
                    };
                  });
              }
            ),
          ]
        : [],
    });
  }, [dashboardApi]);
}
