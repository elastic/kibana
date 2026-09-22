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
import { WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE } from '../../../../../../common';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { _setComputedExecution, setExecution, setStepExecutionsTotal } from '../slice';
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
      const {
        execution: previousExecution,
        stepExecutionsPageCount,
        stepExecutionsTotal: previousStepExecutionsTotal,
      } = getState().detail;

      // A finished run's step docs never change, so full pages already in the store are reused
      // and only newly requested pages are fetched. An in-flight run refetches every page.
      const isSameFinishedRun =
        previousExecution !== undefined &&
        previousExecution.id === id &&
        isTerminalStatus(previousExecution.status);
      const loadedStepExecutions = isSameFinishedRun ? previousExecution.stepExecutions : [];
      const reusablePageCount = Math.min(
        Math.floor(loadedStepExecutions.length / WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE),
        stepExecutionsPageCount
      );
      const reusedStepExecutions = loadedStepExecutions.slice(
        0,
        reusablePageCount * WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE
      );

      // One request per page keeps each response small; the pages concat in page order.
      const stepPageRequests = Array.from(
        { length: stepExecutionsPageCount - reusablePageCount },
        (_, index) =>
          api.getExecutionSteps(id, {
            page: reusablePageCount + index + 1,
            size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
          })
      );

      // includeOutput so AI token metadata (LangChain tokenUsage) is available for
      // tree badges / AI section before step.usage is populated by the engine.
      const [execution, ...stepPages] = await Promise.all([
        api.getExecution(id, {
          includeInput: false,
          includeOutput: true,
          omitStepExecutions: true,
        }),
        ...stepPageRequests,
      ]);

      const response: WorkflowExecutionDto = {
        ...execution,
        stepExecutions: [...reusedStepExecutions, ...stepPages.flatMap((page) => page.results)],
      };
      dispatch(setExecution(response));
      // Every page carries the same run-wide total; reuse the stored one when no page was fetched.
      dispatch(setStepExecutionsTotal(stepPages[0]?.total ?? previousStepExecutionsTotal));

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
