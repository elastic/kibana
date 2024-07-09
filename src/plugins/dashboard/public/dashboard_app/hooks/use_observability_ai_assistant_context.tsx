/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { useEffect, useState } from 'react';
import type { Embeddable } from '@kbn/embeddable-plugin/public';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { ISearchStart } from '@kbn/data-plugin/public';
import {
  LensConfigBuilder,
  type LensConfig,
  type LensMetricConfig,
  type LensPieConfig,
  type LensGaugeConfig,
  type LensXYConfig,
  type LensHeatmapConfig,
  type LensMosaicConfig,
  type LensRegionMapConfig,
  type LensTableConfig,
  type LensTagCloudConfig,
  type LensTreeMapConfig,
  LensDataset,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { DataViewsPublicPluginStart, DataViewListItem } from '@kbn/data-views-plugin/public';
import { LensEmbeddableInput, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { AwaitingDashboardAPI } from '../../dashboard_container';

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
  observabilityAIAssistant,
  dashboardAPI,
  search,
  dataViews,
}: {
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart | undefined;
  dashboardAPI: AwaitingDashboardAPI;
  search: ISearchStart;
  dataViews: DataViewsPublicPluginStart;
}) {
  const [dataViewsList, setDataViewsList] = useState<DataViewListItem[]>([]);
  useEffect(() => {
    if (!observabilityAIAssistant) {
      return;
    }

    const fetchDataViews = async () => {
      if (!dataViewsList.length) {
        const list = await dataViews.getIdsWithTitle();
        setDataViewsList(list);
      }
    };

    const {
      service: { setScreenContext },
      createScreenContextAction,
    } = observabilityAIAssistant;

    const dashboardState = dashboardAPI?.getState();
    fetchDataViews();
    const lensPanels = Object.values(dashboardState?.explicitInput.panels ?? {}).filter(
      (panel) => panel.type === 'lens' && 'attributes' in panel.explicitInput
    );
    const reducedPanels = lensPanels.map((panel) => {
      const lensInput = panel.explicitInput as TypedLensByValueInput;
      const isESQL = isOfAggregateQueryType(lensInput.attributes.state.query);
      let indexPattern: string | undefined;
      if (isESQL) {
        indexPattern = Object.values(lensInput.attributes.state.adHocDataViews ?? {})[0].id;
      } else {
        indexPattern = dataViewsList.find((dataView) =>
          lensInput.attributes.references.some((reference) => reference.id === dataView.id)
        )?.title;
      }
      return {
        type: panel.type,
        id: lensInput.id,
        title: lensInput.attributes?.title ?? lensInput.title,
        description: lensInput.description ?? lensInput.attributes.description,
        isESQL,
        esqlQuery: isESQL ? lensInput.attributes.state.query : undefined,
        visualizationType: lensInput.attributes.visualizationType,
        datasourceType: isESQL ? 'ES|QL' : 'DSL',
        datasourceState: isESQL
          ? lensInput.attributes.state.datasourceStates.textBased
          : lensInput.attributes.state.datasourceStates.formBased,
        indexPattern,
      };
    });

    return setScreenContext({
      starterPrompts: [
        {
          title: 'Explain',
          prompt: 'Can you explain this page?',
          icon: 'inspect',
        },
        {
          title: 'ES|QL',
          prompt: 'Can you find the ES|QL queries used in this  dashboard?',
          icon: 'esqlVis',
        },
        {
          title: 'Analyze',
          prompt: 'Can you analyze my panels?',
          icon: 'bullseye',
        },
        {
          title: 'Suggest',
          prompt: 'Can you suggest some visualizations for this dashboard?',
          icon: 'sparkles',
        },
      ],
      screenDescription: `The user is looking at the dashboard app. Here they can add visualizations to a dashboard and save them. The current dashboard content is these panels:[ ${JSON.stringify(
        reducedPanels
      )}]`,
      actions: dashboardAPI
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
                    search: search.search,
                    signal,
                  }),
                ]);

                const configBuilder = new LensConfigBuilder(dataViews);

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

                return dashboardAPI
                  .addNewPanel<Embeddable>({
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
            createScreenContextAction(
              {
                name: 'update_panel_title_description',
                description:
                  'Update the panel title and description. Pick the correct panel type and fill in the title and description fields.',
                parameters: {
                  type: 'object',
                  properties: {
                    panelId: {
                      type: 'string',
                      description: 'The id of the panel to update',
                    },
                    title: {
                      type: 'string',
                      description: 'The suggested title for the visualization.',
                    },
                    description: {
                      type: 'string',
                      description: 'The suggested description for the visualization.',
                    },
                  },
                  required: ['panelId'],
                } as const,
              },
              async ({ args, signal }) => {
                const { title = '', description = '', panelId } = args;
                dashboardAPI.updateInputForChild(panelId, { title, description });

                return {
                  content: 'Title and description successfully updated',
                };
              }
            ),
          ]
        : [],
    });
  }, [observabilityAIAssistant, dashboardAPI, search, dataViews, dataViewsList]);
}
