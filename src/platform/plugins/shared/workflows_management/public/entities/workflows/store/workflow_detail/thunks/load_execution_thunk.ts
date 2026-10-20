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

const PAGE_REQUEST_CONCURRENCY = 3;

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
      const isCurrentRequest = () =>
        !signal.aborted && getState().detail.executionRequest?.requestId === requestId;
      if (!isCurrentRequest()) {
        return rejectWithValue('Execution load was superseded');
      }

      const pages = keepLoadedPages ? [...loadedPages] : [];
      let total = previousTotal;
      if (pages.length === 0) {
        const firstPage = await api.getExecutionSteps(id, {
          page: 1,
          size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
        });
        pages.push(firstPage.results);
        total = firstPage.total;
      }
      const pageCount = loadMore
        ? loadedPages.length + 1
        : Math.max(
            loadedPages.length,
            Math.min(
              Math.ceil(total / WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE),
              WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT
            )
          );

      // Bound concurrency even when the user has manually loaded beyond the automatic budget.
      for (let offset = pages.length; offset < pageCount; offset += PAGE_REQUEST_CONCURRENCY) {
        if (!isCurrentRequest()) {
          return rejectWithValue('Execution load was superseded');
        }
        const batch = await Promise.all(
          Array.from(
            { length: Math.min(PAGE_REQUEST_CONCURRENCY, pageCount - offset) },
            (_, index) =>
              api.getExecutionSteps(id, {
                page: offset + index + 1,
                size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
              })
          )
        );
        pages.push(...batch.map(({ results }) => results));
        total = batch[0].total;
      }

      return {
        execution: { ...execution, stepExecutions: pages.flat() },
        stepExecutionPages: pages,
        stepExecutionsTotal: total,
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
          (execution.stepExecutionIds !== undefined ||
            stepExecutionPages.length < WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT) &&
          getOmittedStepExecutionsCount(stepExecutionsTotal, stepExecutionPages.length) > 0)
      );
    },
  }
);
