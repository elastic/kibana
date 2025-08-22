/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { openLazyFlyout } from '@kbn/presentation-util';
import { useState } from 'react';
import { useCallback, useMemo } from 'react';
import { addToDashboardTool, usePostToolClientActions } from '@kbn/ai-client-tools-plugin/public';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/public';
import {
  EuiFlyoutHeader,
  EuiTextArea,
  EuiTitle,
  EuiFlyoutBody,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// import { addToDashboardTool } from './add_to_dashboard_tool';
import type { DashboardApi } from '../../dashboard_api/types';
import { coreServices, inferenceService } from '../../services/kibana_services';
import { dataService } from '../../services/kibana_services';
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

  const dependencies = useMemo(() => ({ dashboardApi, dataService }), [dashboardApi]);
  const actions = usePostToolClientActions(addToDashboardTool, dependencies);
  const executeCreateWithAI = useCallback(async () => {
    try {
      setIsLoading(true);
      const defaultConnectorId = await coreServices.uiSettings.get('genAI:defaultConnectorId');

      const resp = await inferenceService?.output({
        id: addToDashboardTool.id,
        connectorId: defaultConnectorId,
        // Inference service's schema is jsonified, not zod object
        schema: addToDashboardTool.parameters,
        input: `Generate Elasticsearch Piped Query Language (ES|QL) for the following user input. ${addToDashboardTool.description}
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
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`--@@CreateWithAIFlyout error`, e);
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
        <EuiSpacer size="m" />

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
