/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from 'redux-toolkit-v1';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';
import {
  WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE,
  WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
} from '../../../../../../common';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import {
  _setComputedExecution,
  setDurationStepExecutions,
  setExecution,
  setStepExecutionsTotal,
} from '../slice';
import { performComputation } from '../utils/computation';

export interface LoadExecutionParams {
  id: string;
}

export type LoadExecutionResponse = WorkflowExecutionDto;

export const loadExecutionThunk = createAsyncThunk<
  LoadExecutionResponse,
  LoadExecutionParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/loadExecutionThunk',
  async ({ id }, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    const api = new WorkflowApi(http);
    try {
      const previousExecution = getState().detail.execution;

      // includeOutput so AI token metadata (LangChain tokenUsage) is available for
      // tree badges / AI section before step.usage is populated by the engine.
      const [execution, stepsPage] = await Promise.all([
        api.getExecution(id, {
          includeInput: false,
          includeOutput: true,
          omitStepExecutions: true,
        }),
        api.getExecutionSteps(id, { page: 1, size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE }),
      ]);
      const response: WorkflowExecutionDto = {
        ...execution,
        stepExecutions: stepsPage.results.slice(0, WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE),
      };
      dispatch(setExecution(response));
      dispatch(setStepExecutionsTotal(stepsPage.total));

      // For terminal executions whose step count exceeds the UI page budget, fetch a larger page
      // so that duration chips cover steps beyond the step-tree's 1000-doc window (e.g. final_step
      // in a long foreach run). In-progress executions are skipped intentionally: their step data
      // is still changing, and each poll already refreshes from page 1.
      if (
        stepsPage.total > WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE &&
        isTerminalStatus(execution.status)
      ) {
        try {
          const durationsPage = await api.getExecutionSteps(id, {
            page: 1,
            size: WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE,
          });
          dispatch(setDurationStepExecutions(durationsPage.results));
        } catch {
          // Degrade gracefully — chips still show from page 1 data via the fallback selector.
        }
      }

      if (id !== previousExecution?.id) {
        // avoid recomputing derived data if the execution is the same
        const computed = performComputation(response.yaml, response.workflowDefinition);
        dispatch(_setComputedExecution(computed));
      }
      return response;
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to load execution';

      notifications.toasts.addError(errorMessage, {
        title: i18n.translate('workflows.detail.loadExecution.error', {
          defaultMessage: 'Failed to load execution',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
