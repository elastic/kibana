/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../types';
import { selectYamlString } from '../selectors';

export interface TestWorkflowParams {
  inputs: Record<string, any>;
}

export interface TestWorkflowResponse {
  workflowExecutionId: string;
}

export const testWorkflowThunk = createAsyncThunk<
  TestWorkflowResponse,
  TestWorkflowParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/testWorkflowThunk',
  async ({ inputs }, { getState, rejectWithValue, extra: { services } }) => {
    try {
      const yamlString = selectYamlString(getState());
      if (!yamlString) {
        return rejectWithValue('No YAML content to test');
      }

      // Make the API call to test the workflow
      const response = await services.http.post<TestWorkflowResponse>(`/api/workflows/test`, {
        body: JSON.stringify({ workflowYaml: yamlString, inputs }),
      });

      return response;
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to test workflow';
      return rejectWithValue(errorMessage);
    }
  }
);
