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
import type { WorkflowDetailDto } from '@kbn/workflows/types/latest';
import { loadWorkflowThunk } from './load_workflow_thunk';
import { PLUGIN_ID } from '../../../../../../common';
import type { WorkflowsServices } from '../../../../../types';
import { selectYamlString } from '../selectors';
import { setWorkflow } from '../slice';
import type { RootState } from '../types';

export interface SaveYamlParams {
  id: string | undefined;
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
      if (id) {
        // Update the workflow in the API if the id is provided
        await services.http.put<void>(`/api/workflows/${id}`, {
          body: JSON.stringify({ yaml: yamlString }),
        });

        // For consistency, dispatch the loadWorkflow thunk to update the workflow in the store to the latest version from the API
        await dispatch(loadWorkflowThunk({ id }));
      } else {
        // Create the workflow in the API if the id is not provided
        const workflow = await services.http.post<WorkflowDetailDto>('/api/workflows', {
          body: JSON.stringify({ yaml: yamlString }),
        });
        dispatch(setWorkflow(workflow));
        services.application.navigateToApp(PLUGIN_ID, { path: workflow.id });
      }
      services.notifications.toasts.addSuccess(
        i18n.translate('workflows.detail.success.workflowSaved', {
          defaultMessage: 'Workflow saved',
        }),
        { toastLifeTimeMs: 2000 }
      );
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to save workflow';
      return rejectWithValue(errorMessage);
    }
  }
);
