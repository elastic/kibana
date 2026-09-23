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
import {
  _setComputedExecution,
  setExecution,
  setStepExecutionPages,
  setStepExecutionsTotal,
} from '../slice';
import { performComputation } from '../utils/computation';

export interface LoadExecutionParams {
  id: string;
  /** True once the poll loop that issued this request was superseded; the response is then dropped. */
  isStale?: () => boolean;
}

export type LoadExecutionResponse = WorkflowExecutionDto | undefined;

export const loadExecutionThunk = createAsyncThunk<
  LoadExecutionResponse,
  LoadExecutionParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/loadExecutionThunk',
  async ({ id, isStale }, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    const api = new WorkflowApi(http);
    try {
      const {
        execution: previousExecution,
        stepExecutionPages: loadedPages,
        stepExecutionsTotal: previousStepExecutionsTotal,
      } = getState().detail;

      // Loaded pages of a run still in flight are refetched so their statuses stay live. A
      // finished run's pages never change, so they are kept; a different run starts from page 1.
      const isSameRun = previousExecution !== undefined && previousExecution.id === id;
      const keepLoadedPages = isSameRun && isTerminalStatus(previousExecution.status);
      const pageCountToFetch = keepLoadedPages
        ? loadedPages.length === 0
          ? 1
          : 0
        : isSameRun
        ? Math.max(1, loadedPages.length)
        : 1;

      // One request per page keeps each response small; the pages concat in page order.
      const stepPageRequests = Array.from({ length: pageCountToFetch }, (_, index) =>
        api.getExecutionSteps(id, {
          page: index + 1,
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

      // Another execution was selected while this request was in flight: the store already
      // holds (or will hold) that run, so committing this response would overwrite it.
      if (isStale?.()) {
        return getState().detail.execution;
      }

      // Replace the pages this poll fetched and keep any page "Show more" appended meanwhile,
      // but only while the store still holds this run.
      const { execution: currentExecution, stepExecutionPages: currentPages } = getState().detail;
      const fetchedPages = stepPages.map((page) => page.results);
      const appendedPages =
        currentExecution?.id === id ? currentPages.slice(fetchedPages.length) : [];

      // This poll saw the run finish, so it is the last one. Pages appended while it was in
      // flight were fetched before the final flush and would otherwise keep stale statuses.
      // (A run already known to be finished has final pages; nothing to refetch.)
      const sawRunFinish = !keepLoadedPages && isTerminalStatus(execution.status);
      const finalAppendedPages =
        appendedPages.length > 0 && sawRunFinish
          ? (
              await Promise.all(
                appendedPages.map((_, index) =>
                  api.getExecutionSteps(id, {
                    page: fetchedPages.length + index + 1,
                    size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
                  })
                )
              )
            ).map((page) => page.results)
          : appendedPages;
      const pages = [...fetchedPages, ...finalAppendedPages];

      const response: WorkflowExecutionDto = { ...execution, stepExecutions: pages.flat() };
      dispatch(setExecution(response));
      dispatch(setStepExecutionPages(pages));
      // Every page carries the same run-wide total; reuse the stored one when no page was fetched.
      dispatch(setStepExecutionsTotal(stepPages[0]?.total ?? previousStepExecutionsTotal));

      if (id !== previousExecution?.id) {
        // avoid recomputing derived data if the execution is the same
        const computed = performComputation(response.yaml, response.workflowDefinition);
        dispatch(_setComputedExecution(computed));
      }
      return response;
    } catch (error) {
      // A superseded request's failure is not this execution's problem: settle quietly.
      if (isStale?.()) {
        return getState().detail.execution;
      }
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
