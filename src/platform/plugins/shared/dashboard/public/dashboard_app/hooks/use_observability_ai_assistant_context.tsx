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
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { z } from '@kbn/zod';
import { pick } from 'lodash';
import {
  EuiFlyoutHeader,
  EuiTextArea,
  EuiTitle,
  EuiFlyoutBody,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { openLazyFlyout } from '@kbn/presentation-util';
import { i18n } from '@kbn/i18n';
// import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/public';

import {
  usePostToolClientActions,
  type OneChatToolWithClientCallback,
} from '@kbn/ai-client-tools-plugin/public';
import { dataService, observabilityAssistantService } from '../../services/kibana_services';
import { DashboardApi } from '../../dashboard_api/types';
import { coreServices, inferenceService } from '../../services/kibana_services';
import { convertSchemaToObservabilityParameters } from './schema_adapters';

const chartTypes = [
  'bar',
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

const schema = z.object({
  esql: z.object({
    query: z
      .string()
      .describe(
        'The ES|QL query for this visualization. Use the "query" function to generate ES|QL first and then add it here.'
      ),
  }),
  type: z.enum(chartTypes as unknown as [string, ...string[]]).describe('The type of chart'),
  layers: z
    .object({
      xy: z
        .object({
          xAxis: z.string(),
          yAxis: z.string(),
          type: z.enum(['line', 'bar', 'area']),
        })
        .optional(),
      donut: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      metric: z.object({}).optional(),
      gauge: z.object({}).optional(),
      pie: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      heatmap: z
        .object({
          xAxis: z.string(),
          breakdown: z.string(),
        })
        .optional(),
      mosaic: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      regionmap: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      table: z.object({}).optional(),
      tagcloud: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      treemap: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
    })
    .optional(),
  title: z.string().describe('An optional title for the visualization.').optional(),
});

const NO_ACTIONS = [];
const executeAddToDashboard =
  (dependencies: { dashboardApi: DashboardApi | undefined }) =>
  async ({ args, signal }: { args: z.infer<typeof schema>; signal: AbortSignal }) => {
    const { dashboardApi } = dependencies;
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

    const firstMetricColumn = columns.find((column) => column.meta.type === 'number')?.id;

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
              xAxis: layers?.xy?.xAxis,
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
        serializedState: {
          rawState: { ...embeddableInput },
        },
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
  };

interface AddToDashboardClientToolDependencies {
  dashboardApi: DashboardApi | undefined;
}

const tool: OneChatToolWithClientCallback<AddToDashboardClientToolDependencies> = {
  toolId: '.add_to_dashboard',
  name: 'add_to_dashboard',
  description:
    'Add an ES|QL visualization to the current dashboard. Pick a single chart type, and based on the chart type, the corresponding key for `layers`. E.g., when you select type:metric, fill in only layers.metric.',
  schema,
  screenDescription:
    'The user is looking at the dashboard app. Here they can add visualizations to a dashboard and save them',
  handler: async ({ indexPattern }, { modelProvider, esClient }) => {
    // const indices = await esClient.asCurrentUser.cat.indices({ index: indexPattern });

    // const model = await modelProvider.getDefaultModel();
    // const response = await model.inferenceClient.chatComplete(somethingWith(indices));

    // return response;
    return [];
  },
  getPreToolClientActions: async (dependencies: AddToDashboardClientToolDependencies) => {
    if (!dependencies.dashboardApi) {
      return NO_ACTIONS;
    }
    return [executeAddToDashboard(dependencies)];
  },
  getPostToolClientActions: async (dependencies: AddToDashboardClientToolDependencies) => {
    if (!dependencies.dashboardApi) {
      return NO_ACTIONS;
    }
    return [executeAddToDashboard(dependencies)];
  },
};

const getObservabilityToolDetails = (oneChatTool: OneChatToolWithClientCallback) => ({
  ...pick(oneChatTool, ['name', 'description']),
  parameters: convertSchemaToObservabilityParameters(oneChatTool.schema),
});

// USING CONNECTOR ID

const PLACEHOLDER_USER_PROMPT =
  'Create a Lens XY bar chart visualization for index "kibana_sample_data_logstsdb" for count() vs top 10 values of clientip';

export const CreateWithAIFlyout = ({
  modalTitleId,
  dashboardApi,
}: {
  modalTitleId: string;
  dashboardApi: CanAddNewPanel;
}) => {
  const [text, setText] = useState(PLACEHOLDER_USER_PROMPT);
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const dependencies = useMemo(() => ({ dashboardApi }), [dashboardApi]);
  const actions = usePostToolClientActions(tool, dependencies);
  const executeCreateWithAI = useCallback(async () => {
    try {
      setIsLoading(true);
      const defaultConnectorId = await coreServices.uiSettings.get('genAI:defaultConnectorId');

      // const callNaturalLanguageToEsql = async (question: string) => {
      //   return lastValueFrom(
      //     naturalLanguageToEsql({
      //       client: inferenceService,
      //       connectorId: defaultConnectorId,
      //       input: question,
      //       functionCalling: 'auto',
      //       logger: { debug: () => undefined },
      //     })
      //   );
      // };
      // const esqlQuery = await callNaturalLanguageToEsql(text);
      // console.log(`--@@esqlQuery`, esqlQuery);

      const resp = await inferenceService?.output({
        id: tool.toolId,
        connectorId: defaultConnectorId,
        schema: convertSchemaToObservabilityParameters(tool.schema),
        input: `Generate Elasticsearch Piped Query Language (ES|QL) for the following user input. ${tool.description}
        ES|QL should start with 'from' and never 'select'

        Examples of ES|QL queries:
        FROM kibana_sample_data_ecommerce | COMPLETION result = "prompt" WITH \`openai-completion\` | LIMIT 2
        FROM index | SAMPLE 0.1
        FROM a | KEEP a.b
        FROM a | STATS a WHERE b == test(c, 123)
        FROM a | STATS a = AGG(123) WHERE b == TEST(c, 123)
        Input: ${text}
        `,
      });
      const args = resp.output;
      const correctedQuery = correctCommonEsqlMistakes(args.esql.query);
      args.esql.query = correctedQuery.output;

      const controller = new AbortController();
      for (const action of actions) {
        await action({ args, signal: controller.signal });
      }

      // // Parse content that starts wiht ```json and ends with ```
      // let jsonContent = resp.content.match(/```json\n(.*)\n```/s);
      // jsonContent = JSON.parse(jsonContent[1]);
      // // const jsonContent = PLACEHOLDER_JSON;
      // if (jsonContent) {
      //   const json = jsonContent; // JSON.parse(jsonContent[1]);]
      //   // Recursively assign 'references' in json with constant
      //   const updatedJson = updateReferences(json, [
      //     {
      //       type: 'index-pattern',
      //       id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      //       name: 'indexpattern-datasource-layer-d5cb6be0-b8e9-446c-b6cd-281572b55130',
      //     },
      //   ]);
      //   // @TODO: remove
      //   console.log(`--@@updatedJson`, updatedJson);

      //   const embeddable = await dashboardApi.addNewPanel(updatedJson, true);
      // }
      // Handle chatResponse if needed
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`--@@e`, e);
      // Handle error if needed
    } finally {
      setIsLoading(false);
    }
  }, [text, actions]);
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={modalTitleId}>
            {i18n.translate('embeddableApi.addPanel.Title', { defaultMessage: 'Create with AI' })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiSpacer size="m" />
        <EuiTextArea
          fullWidth
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={i18n.translate('dashboard.createWithAI.placeholder', {
            defaultMessage: 'Example: {placeholder}"',
            values: { placeholder: PLACEHOLDER_USER_PROMPT },
          })}
        />
        <EuiButton isLoading={isLoading} onClick={executeCreateWithAI}>
          Generate visualization
        </EuiButton>
      </EuiFlyoutBody>
    </>
  );
};
export async function createLensWithAI(dashboardApi: DashboardApi) {
  openLazyFlyout({
    core: coreServices,
    parentApi: dashboardApi,
    loadContent: async ({ ariaLabelledBy }) => {
      return <CreateWithAIFlyout dashboardApi={dashboardApi} modalTitleId={ariaLabelledBy} />;
    },
    flyoutProps: {
      'data-test-subj': 'dashboardCreateWithAIFlyout',
      triggerId: 'createWithAIButton',
    },
  });
}

export function useObservabilityAIAssistantContext({
  dashboardApi,
}: {
  dashboardApi: DashboardApi | undefined;
}) {
  const dependencies = { dashboardApi };
  const [actions, setActions] = useState<any[]>(NO_ACTIONS);

  useEffect(
    function postToolClientActionsEffect() {
      let unmounted = false;
      async function getActions() {
        const postToolClientActions = await tool.getPostToolClientActions({ dashboardApi });
        if (!unmounted) {
          setActions(postToolClientActions);
        }
      }
      getActions();
      return () => {
        unmounted = true;
      };
    },
    [dashboardApi]
  );
  useEffect(() => {
    if (!observabilityAssistantService) {
      return;
    }
    const {
      service: { setScreenContext },
      createScreenContextAction,
    } = observabilityAssistantService;

    return setScreenContext({
      screenDescription: tool.screenDescription,
      actions: actions.map((action) =>
        createScreenContextAction(getObservabilityToolDetails(tool), action)
      ),
    });
  }, [actions]);
}
