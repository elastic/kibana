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
import { useCallback } from 'react';
import { addToDashboardTool } from '@kbn/ai-client-tools-plugin/public';
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
import { coreServices } from '../../services/kibana_services';
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
  'Create a dashboard for index "kibana_sample_data_logstsdb". I want to analyze: count() vs top 10 values of clientip, bytes vs time, response vs time';

export const CreateDashboardWithAIFlyout = ({
  modalTitleId,
  dashboardApi,
}: {
  modalTitleId: string;
  dashboardApi: DashboardApi;
}) => {
  const [text, setText] = useState(PLACEHOLDER_USER_PROMPT);
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { http } = coreServices;
  const generateDashboard = useCallback(async () => {
    setIsLoading(true);
    const resp = await http.post('/api/chat/converse', {
      body: JSON.stringify({
        input: text,
        agent_id: 'create_dashboard',
      }),
    });

    const conversationId = resp.conversation_id;

    const toolCalls = resp.steps.filter((step) => step.tool_id === '.add_to_dashboard');
    const results = toolCalls.map((toolCall) => toolCall.results[0]);

    const postToolClientActions = await addToDashboardTool.getPostToolClientActions({
      dashboardApi,
      dataService,
    });
    for (const result of results) {
      const res = await Promise.allSettled(
        postToolClientActions.map((action) =>
          action({ args: result, signal: new AbortController().signal })
        )
      );
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

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

        <EuiButton isLoading={isLoading} onClick={generateDashboard}>
          Generate dashboard
        </EuiButton>
      </EuiFlyoutBody>
    </>
  );
};

export async function createDashboardWithAI(dashboardApi?: DashboardApi) {
  openLazyFlyout({
    core: coreServices,
    parentApi: dashboardApi,
    loadContent: async ({ ariaLabelledBy }) => {
      return (
        <CreateDashboardWithAIFlyout modalTitleId={ariaLabelledBy} dashboardApi={dashboardApi} />
      );
    },
    flyoutProps: {
      'data-test-subj': 'dashboardCreateWithAIFlyout',
      triggerId: 'createWithAIButton',
    },
  });
}
