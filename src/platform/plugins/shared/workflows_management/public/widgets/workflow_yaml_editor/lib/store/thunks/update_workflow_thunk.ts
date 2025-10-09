/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { EsWorkflow } from '@kbn/workflows';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../types';
import { updateWorkflow } from '../slice';

export interface UpdateWorkflowParams {
  id: string;
  workflow: Partial<EsWorkflow>;
}

export type UpdateWorkflowResponse = void;

export const updateWorkflowThunk = createAsyncThunk<
  UpdateWorkflowResponse,
  UpdateWorkflowParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/updateWorkflowThunk',
  async ({ id, workflow }, { dispatch, rejectWithValue, extra: { services } }) => {
    try {
      // Make the API call to update the workflow
      await services.http.put<void>(`/api/workflows/${id}`, {
        body: JSON.stringify(workflow),
      });
      // Update the workflow in the store
      dispatch(updateWorkflow(workflow));
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to update workflow';
      return rejectWithValue(errorMessage);
    }
  }
);
