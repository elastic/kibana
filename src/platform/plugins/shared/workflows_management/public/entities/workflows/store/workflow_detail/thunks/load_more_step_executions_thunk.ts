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
import { WorkflowApi } from '@kbn/workflows-ui';
import { WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE } from '../../../../../../common';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { setStepExecutionPages, setStepExecutionsTotal } from '../slice';

export interface LoadMoreStepExecutionsParams {
  id: string;
}

/** Appends the next page of step executions for the execution currently in the store. */
export const loadMoreStepExecutionsThunk = createAsyncThunk<
  void,
  LoadMoreStepExecutionsParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/loadMoreStepExecutionsThunk',
  async ({ id }, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    const api = new WorkflowApi(http);
    const page = getState().detail.stepExecutionPages.length + 1;
    try {
      const stepsPage = await api.getExecutionSteps(id, {
        page,
        size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
      });

      // The user may have switched execution while this page was in flight.
      const { execution, stepExecutionPages } = getState().detail;
      if (execution?.id !== id || stepExecutionPages.length !== page - 1) {
        return;
      }

      dispatch(setStepExecutionPages([...stepExecutionPages, stepsPage.results]));
      dispatch(setStepExecutionsTotal(stepsPage.total));
    } catch (error) {
      const errorMessage = error.body?.message || error.message || 'Failed to load step executions';

      notifications.toasts.addError(errorMessage, {
        title: i18n.translate('workflows.detail.loadMoreStepExecutions.error', {
          defaultMessage: 'Failed to load more step executions',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
