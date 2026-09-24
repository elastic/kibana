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
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';
import {
  getOmittedStepExecutionsCount,
  WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT,
  WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
} from '../../../../../../common';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import type { ComputedData } from '../types';
import { performComputation } from '../utils/computation';

export interface LoadExecutionParams {
  id: string;
  loadMore?: boolean;
}

export interface LoadExecutionResponse {
  execution: WorkflowExecutionDto;
  stepExecutionPages: WorkflowStepExecutionDto[][];
  stepExecutionsTotal: number;
  computedExecution: ComputedData;
}

/** Loads one execution snapshot for both polling and pagination. */
export const loadExecutionThunk = createAsyncThunk<
  LoadExecutionResponse,
  LoadExecutionParams,
  { state: RootState; extra: { services: WorkflowsServices }; rejectValue: string }
>(
  'detail/loadExecutionThunk',
  async (
    { id, loadMore = false },
    { getState, requestId, signal, rejectWithValue, extra: { services } }
  ) => {
    const { http, notifications } = services;
    const api = new WorkflowApi(http);
    const {
      execution: previousExecution,
      stepExecutionPages: loadedPages,
      stepExecutionsTotal: previousTotal,
      computedExecution,
    } = getState().detail;

    try {
      const keepLoadedPages = previousExecution && isTerminalStatus(previousExecution.status);
      // Read the execution first: the engine persists final step documents before its terminal status.
      const execution =
        loadMore && keepLoadedPages
          ? previousExecution
          : await api.getExecution(id, {
              includeInput: false,
              includeOutput: true,
              omitStepExecutions: true,
            });
      const pageCount = Math.max(1, loadedPages.length + (loadMore ? 1 : 0));
      const keptPages = keepLoadedPages ? loadedPages : [];
      const fetchedPages = await Promise.all(
        Array.from({ length: pageCount - keptPages.length }, (_, index) =>
          api.getExecutionSteps(id, {
            page: keptPages.length + index + 1,
            size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
          })
        )
      );
      const pages = [...keptPages, ...fetchedPages.map(({ results }) => results)];

      return {
        execution: { ...execution, stepExecutions: pages.flat() },
        stepExecutionPages: pages,
        stepExecutionsTotal: fetchedPages[0]?.total ?? previousTotal,
        computedExecution:
          computedExecution ?? performComputation(execution.yaml, execution.workflowDefinition),
      };
    } catch (error) {
      const errorMessage = error.body?.message || error.message || 'Failed to load execution';
      if (getState().detail.executionRequest?.requestId === requestId && !signal.aborted) {
        notifications.toasts.addError(errorMessage, {
          title: loadMore
            ? i18n.translate('workflows.detail.loadMoreStepExecutions.error', {
                defaultMessage: 'Failed to load more step executions',
              })
            : i18n.translate('workflows.detail.loadExecution.error', {
                defaultMessage: 'Failed to load execution',
              }),
        });
      }
      return rejectWithValue(errorMessage);
    }
  },
  {
    condition: ({ id, loadMore }, { getState }) => {
      const { execution, executionRequest, stepExecutionPages, stepExecutionsTotal } =
        getState().detail;
      if (executionRequest?.id === id) {
        return false;
      }
      return (
        !loadMore ||
        (execution?.id === id &&
          stepExecutionPages.length < WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT &&
          getOmittedStepExecutionsCount(stepExecutionsTotal, stepExecutionPages.length) > 0)
      );
    },
  }
);
