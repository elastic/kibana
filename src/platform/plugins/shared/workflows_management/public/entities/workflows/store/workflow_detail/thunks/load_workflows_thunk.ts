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
import { getErrorMessage } from './get_error_message';
import type { WorkflowsServices } from '../../../../../types';
import type { WorkflowsResponse } from '../../../model/types';
import type { RootState } from '../../types';
import { initialWorkflowsState, setWorkflows } from '../slice';

/** Maximum number of workflows to fetch for autocomplete/lookup. */
const MAX_WORKFLOWS_LOOKUP_SIZE = 1000;

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
        size: MAX_WORKFLOWS_LOOKUP_SIZE,
        page: 1,
      }),
    });

    if (!Array.isArray(response.results)) {
      const invalidMessage = 'Invalid workflows search response: results is not an array';
      notifications.toasts.addError(new Error(invalidMessage), {
        title: 'Failed to load workflows',
      });
      dispatch(setWorkflows(initialWorkflowsState));
      return rejectWithValue(invalidMessage);
    }

    const workflowsMap: WorkflowsResponse['workflows'] = {};
    response.results.forEach((workflow) => {
      // Only use inputs if they're in legacy array format (for autocomplete)
      // JSON Schema format inputs are not used by autocomplete
      const inputs = workflow.definition?.inputs;
      let legacyInputs: WorkflowsResponse['workflows'][string]['inputs'] | undefined;
      if (Array.isArray(inputs)) {
        legacyInputs = inputs as WorkflowsResponse['workflows'][string]['inputs'];
      }

      workflowsMap[workflow.id] = {
        id: workflow.id,
        name: workflow.name,
        inputs: legacyInputs,
      };
    });

    const workflowsResponse: WorkflowsResponse = {
      workflows: workflowsMap,
      totalWorkflows: response.total || 0,
    };

    dispatch(setWorkflows(workflowsResponse));

    return workflowsResponse;
  } catch (error) {
    const errorMessage = getErrorMessage(error, 'Failed to load workflows');

    notifications.toasts.addError(new Error(errorMessage), {
      title: 'Failed to load workflows',
    });
    dispatch(setWorkflows(initialWorkflowsState));
    return rejectWithValue(errorMessage);
  }
});
