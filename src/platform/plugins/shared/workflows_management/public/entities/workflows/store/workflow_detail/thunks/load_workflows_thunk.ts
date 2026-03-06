/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { searchWorkflows } from '@kbn/workflows-ui';
import type { WorkflowsServices } from '../../../../../types';
import type { WorkflowsResponse } from '../../../model/types';
import type { RootState } from '../../types';
import { initialWorkflowsState, setWorkflows } from '../slice';

/**
 * Maximum number of workflows to fetch for autocomplete/lookup.
 * Single fetch keeps the thunk simple; pagination could be added later if needed.
 */
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
    const response = await searchWorkflows(http, {
      size: MAX_WORKFLOWS_LOOKUP_SIZE,
      page: 1,
    });

    const workflowsMap: WorkflowsResponse['workflows'] = {};
    response.results.forEach((workflow) => {
      workflowsMap[workflow.id] = {
        id: workflow.id,
        name: workflow.name,
        inputsSchema: normalizeInputsToJsonSchema(workflow.definition?.inputs),
      };
    });

    const workflowsResponse: WorkflowsResponse = {
      workflows: workflowsMap,
      totalWorkflows: response.total || 0,
    };

    dispatch(setWorkflows(workflowsResponse));

    return workflowsResponse;
  } catch (error) {
    const errorMessage =
      error && typeof error === 'object' && 'body' in error
        ? (error as { body?: { message?: string } }).body?.message
        : undefined;
    const message =
      typeof errorMessage === 'string'
        ? errorMessage
        : error instanceof Error
        ? error.message
        : 'Failed to load workflows';

    notifications.toasts.addError(new Error(message), {
      title: 'Failed to load workflows',
    });
    dispatch(setWorkflows(initialWorkflowsState));
    return rejectWithValue(message);
  }
});
