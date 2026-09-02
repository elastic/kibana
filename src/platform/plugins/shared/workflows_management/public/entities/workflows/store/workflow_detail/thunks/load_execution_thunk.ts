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
import { WorkflowApi } from '@kbn/workflows-ui';
import { loadExecutionStepPages } from './load_execution_step_pages';
import { WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE } from '../../../../../../common';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { _setComputedExecution, setExecution } from '../slice';
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
      const cachedSteps = previousExecution?.id === id ? previousExecution.stepExecutions : [];
      const cachedTotal =
        previousExecution?.id === id
          ? cachedSteps.length + (previousExecution.stepExecutionsTruncatedCount ?? 0)
          : 0;

      const [execution, stepsPage] = await Promise.all([
        api.getExecution(id, {
          includeInput: false,
          includeOutput: false,
          omitStepExecutions: true,
        }),
        loadExecutionStepPages({
          fetchPage: (page, size) => api.getExecutionSteps(id, { page, size }),
          cachedSteps,
          cachedTotal,
          maxSteps: WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE,
        }),
      ]);
      const truncatedCount = stepsPage.total - stepsPage.steps.length;
      const response: WorkflowExecutionDto = {
        ...execution,
        stepExecutions: stepsPage.steps,
        ...(truncatedCount > 0 ? { stepExecutionsTruncatedCount: truncatedCount } : {}),
      };
      dispatch(setExecution(response));

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
