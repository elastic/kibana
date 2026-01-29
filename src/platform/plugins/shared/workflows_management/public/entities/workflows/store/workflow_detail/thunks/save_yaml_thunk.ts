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
import { queryClient } from '../../../../../shared/lib/query_client';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { selectWorkflowId, selectYamlString } from '../selectors';
import { setWorkflow } from '../slice';

export type SaveYamlParams = void;
export type SaveYamlResponse = void;

export const saveYamlThunk = createAsyncThunk<
  SaveYamlResponse,
  SaveYamlParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/saveYamlThunk',
  async (_, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications, application } = services;
    try {
      const state = getState();
      const yamlString = selectYamlString(state);
      if (!yamlString) {
        return rejectWithValue('No YAML content to save');
      }

      const id = selectWorkflowId(state);
      if (id) {
        // Update the workflow in the API if the id is provided
        await http.put<void>(`/api/workflows/${id}`, {
          body: JSON.stringify({ yaml: yamlString }),
        });

        // For consistency, dispatch the loadWorkflow thunk to update the workflow in the store to the latest version from the API
        await dispatch(loadWorkflowThunk({ id }));
      } else {
        // Create the workflow in the API if the id is not provided
        const workflow = await http.post<WorkflowDetailDto>('/api/workflows', {
          body: JSON.stringify({ yaml: yamlString }),
        });

        // Update the workflow in the store
        dispatch(setWorkflow(workflow));

        // Invalidate relevant queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['workflows'] });
        queryClient.invalidateQueries({ queryKey: ['workflows', id] });

        // Navigate to the workflow detail page
        application.navigateToApp(PLUGIN_ID, { path: workflow.id });
      }
      notifications.toasts.addSuccess(
        i18n.translate('workflows.detail.saveYaml.success', {
          defaultMessage: 'Workflow saved',
        }),
        { toastLifeTimeMs: 2000 }
      );
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to save workflow';

      notifications.toasts.addError(new Error(errorMessage), {
        title: i18n.translate('workflows.detail.saveYaml.error', {
          defaultMessage: 'Failed to save workflow',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
