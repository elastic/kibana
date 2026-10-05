/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import type { StepLogsApi } from '@kbn/workflows-extensions/public';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { StepDetailAccordionSection } from './step_detail_accordion_section';
import { StepLogsView } from './step_logs_view';
import { useKibana } from '../../../hooks/use_kibana';

const LOGS_PAGE_SIZE = 100;
const MAX_LOG_PAGES = 100;

interface StepLogsSectionProps {
  stepExecution: WorkflowStepExecutionDto;
  workflowExecutionId: string;
}

/** Logs accordion for a step whose definition opts in via `logs.enabled`. */
export const StepLogsSection = React.memo<StepLogsSectionProps>(
  ({ stepExecution, workflowExecutionId }) => {
    const { workflowsExtensions } = useKibana().services;
    const api = useWorkflowsApi();

    const logsConfig = useMemo(
      () =>
        stepExecution.stepType
          ? workflowsExtensions.getStepDefinition(stepExecution.stepType)?.logs
          : undefined,
      [stepExecution.stepType, workflowsExtensions]
    );

    const logsApi = useMemo<StepLogsApi>(
      () => ({
        fetchLogs: async () => {
          if (!stepExecution.id) return [];
          const allLogs: Awaited<ReturnType<typeof api.getExecutionLogs>>['logs'] = [];
          for (let page = 1; page <= MAX_LOG_PAGES; page++) {
            const response = await api.getExecutionLogs(workflowExecutionId, {
              stepExecutionId: stepExecution.id,
              sortOrder: 'asc',
              size: LOGS_PAGE_SIZE,
              page,
            });
            allLogs.push(...response.logs);
            if (response.logs.length === 0 || allLogs.length >= response.total) break;
          }
          return allLogs;
        },
      }),
      [api, workflowExecutionId, stepExecution.id]
    );

    if (!logsConfig?.enabled) {
      return null;
    }

    return (
      <StepDetailAccordionSection
        title={i18n.translate('workflows.executionFlyout.stepDetail.logs', {
          defaultMessage: 'Logs',
        })}
        data-test-subj="workflowExecutionStepLogs"
      >
        <StepLogsView stepExecution={stepExecution} config={logsConfig} logsApi={logsApi} />
      </StepDetailAccordionSection>
    );
  }
);

StepLogsSection.displayName = 'StepLogsSection';
