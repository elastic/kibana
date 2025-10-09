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
import { loadWorkflowThunk } from './load_workflow_thunk';

export interface SaveYamlParams {
  id: string;
}

export type SaveYamlResponse = void;

export const saveYamlThunk = createAsyncThunk<
  SaveYamlResponse,
  SaveYamlParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/saveYamlThunk',
  async ({ id }, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    try {
      const yamlString = selectYamlString(getState());
      if (!yamlString) {
        return rejectWithValue('No YAML content to save');
      }

      // Make the API call to save the workflow
      await services.http.put<void>(`/api/workflows/${id}`, {
        body: JSON.stringify({ yaml: yamlString }),
      });

      // For consistency, dispatch the loadWorkflow thunk to update the workflow in the store to the latest version
      await dispatch(loadWorkflowThunk({ id }));
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to save workflow';
      return rejectWithValue(errorMessage);
    }
  }
);
