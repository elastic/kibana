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
import type { WorkflowsResponse } from '../../../model/types';
import type { RootState } from '../../types';
import { initialWorkflowsState, setWorkflows } from '../slice';

export type LoadWorkflowsParams = void;
export type LoadWorkflowsResponse = WorkflowsResponse;

export const loadWorkflowsThunk = createAsyncThunk<
  LoadWorkflowsResponse,
  LoadWorkflowsParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>('detail/loadWorkflowsThunk', async (_, { dispatch, rejectWithValue, extra: { services } }) => {
  const { http, notifications } = services;
  try {
    const response = await http.post<{
      results: WorkflowDetailDto[];
      total: number;
    }>('/api/workflows/search', {
      body: JSON.stringify({
        size: 1000, // Fetch up to 1000 workflows for lookup
        page: 1,
      }),
    });

    const workflowsMap: WorkflowsResponse['workflows'] = {};
    (response.results || []).forEach((workflow) => {
      workflowsMap[workflow.id] = {
        id: workflow.id,
        name: workflow.name,
        inputs: workflow.definition?.inputs || undefined,
      };
    });

    const workflowsResponse: WorkflowsResponse = {
      workflows: workflowsMap,
      totalWorkflows: response.total || 0,
    };

    dispatch(setWorkflows(workflowsResponse));

    return workflowsResponse;
  } catch (error) {
    const errorMessage = error.body?.message || error.message || 'Failed to load workflows';

    notifications.toasts.addError(errorMessage, {
      title: 'Failed to load workflows',
    });
    dispatch(setWorkflows(initialWorkflowsState));
    return rejectWithValue(errorMessage);
  }
});
