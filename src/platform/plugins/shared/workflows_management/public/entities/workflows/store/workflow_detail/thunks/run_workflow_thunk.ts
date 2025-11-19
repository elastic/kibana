/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { i18n } from '@kbn/i18n';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { selectWorkflow } from '../selectors';

export interface RunWorkflowParams {
  inputs: Record<string, unknown>;
}

export interface RunWorkflowResponse {
  workflowExecutionId: string;
}

// This is unused thunk, but I think it worth keeping it. Maybe will be used in the future.
export const runWorkflowThunk = createAsyncThunk<
  RunWorkflowResponse,
  RunWorkflowParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/runWorkflowThunk',
  async ({ inputs }, { getState, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    try {
      const workflow = selectWorkflow(getState());

      if (!workflow) {
        return rejectWithValue('No workflow to run');
      }

      // Make the API call to run the workflow
      const response = await http.post<RunWorkflowResponse>(`/api/workflows/${workflow.id}/run`, {
        body: JSON.stringify({
          inputs,
        }),
      });
      // Show success notification
      notifications.toasts.addSuccess(
        i18n.translate('workflows.detail.runWorkflow.success', {
          defaultMessage: 'Workflow execution started',
        }),
        { toastLifeTimeMs: 2000 }
      );
      return response;
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to run workflow';

      notifications.toasts.addError(new Error(errorMessage), {
        title: i18n.translate('workflows.detail.runWorkflow.error', {
          defaultMessage: 'Failed to run workflow',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
