/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowsServices } from '../../../../../types';
import { setWorkflow } from '../slice';
import type { RootState } from '../types';

export interface LoadWorkflowParams {
  id: string;
}

export type LoadWorkflowResponse = WorkflowDetailDto;

export const loadWorkflowThunk = createAsyncThunk<
  LoadWorkflowResponse,
  LoadWorkflowParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/loadWorkflowThunk',
  async ({ id }, { dispatch, rejectWithValue, extra: { services } }) => {
    try {
      // Make the API call to load the workflow
      const response = await services.http.get<WorkflowDetailDto>(`/api/workflows/${id}`);
      dispatch(setWorkflow(response));
      return response;
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to load workflow';
      return rejectWithValue(errorMessage);
    }
  }
);
