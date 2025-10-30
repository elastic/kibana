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
import type { EsWorkflow } from '@kbn/workflows';
import { queryClient } from '../../../../../shared/lib/query_client';
import type { WorkflowsServices } from '../../../../../types';
import { selectWorkflowId } from '../selectors';
import { updateWorkflow } from '../slice';
import type { RootState } from '../types';

export interface UpdateWorkflowParams {
  workflow: Partial<EsWorkflow>;
}

export type UpdateWorkflowResponse = void;

export const updateWorkflowThunk = createAsyncThunk<
  UpdateWorkflowResponse,
  UpdateWorkflowParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/updateWorkflowThunk',
  async ({ workflow }, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    try {
      const id = selectWorkflowId(getState());
      if (!id) {
        throw new Error('No workflow ID to update');
      }

      // Make the API call to update the workflow
      await http.put<void>(`/api/workflows/${id}`, {
        body: JSON.stringify(workflow),
      });

      // Invalidate relevant queries from react-query cache
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id] });

      // Show success notification
      notifications.toasts.addSuccess(
        i18n.translate('workflows.detail.updateWorkflow.success', {
          defaultMessage: 'Workflow updated',
        }),
        { toastLifeTimeMs: 2000 }
      );

      // Update the workflow in the store
      dispatch(updateWorkflow(workflow));
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to update workflow';

      notifications.toasts.addError(new Error(errorMessage), {
        title: i18n.translate('workflows.detail.updateWorkflow.error', {
          defaultMessage: 'Failed to update workflow',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
