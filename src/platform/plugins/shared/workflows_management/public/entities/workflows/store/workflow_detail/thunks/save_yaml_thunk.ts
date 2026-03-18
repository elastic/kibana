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
import { WorkflowsBaseTelemetry } from '../../../../../common/service/telemetry';
import { queryClient } from '../../../../../shared/lib/query_client';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import {
  selectWorkflow,
  selectWorkflowDefinition,
  selectWorkflowId,
  selectYamlString,
} from '../selectors';
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

    // Initialize telemetry
    const workflowsManagement = services.workflowsManagement;

    // Always create telemetry instance - use real service if available, otherwise no-op
    const telemetry = workflowsManagement?.telemetry
      ? new WorkflowsBaseTelemetry(workflowsManagement.telemetry)
      : new WorkflowsBaseTelemetry({
          reportEvent: () => {
            // No-op if telemetry service is not available
          },
        });

    try {
      const state = getState();
      const yamlString = selectYamlString(state);
      const workflowDefinition = selectWorkflowDefinition(state);
      const id = selectWorkflowId(state);

      if (!yamlString) {
        return rejectWithValue('No YAML content to save');
      }

      if (id) {
        // Update the workflow in the API if the id is provided
        await http.put<void>(`/api/workflows/${id}`, {
          body: JSON.stringify({ yaml: yamlString }),
        });

        // Get original workflow state for comparison
        const originalWorkflow = selectWorkflow(state);

        // Report telemetry for workflow update
        // The telemetry service automatically determines editorType ('yaml' when yaml is in update)
        telemetry.reportWorkflowUpdated({
          workflowId: id,
          workflowUpdate: { yaml: yamlString },
          workflowDefinition: workflowDefinition || undefined,
          originalWorkflow: originalWorkflow?.definition || undefined,
          hasValidationErrors: false,
          validationErrorCount: 0,
          isBulkAction: false,
          error: undefined,
          origin: 'workflow_detail',
        });

        // For consistency, dispatch the loadWorkflow thunk to update the workflow in the store to the latest version from the API
        await dispatch(loadWorkflowThunk({ id }));
      } else {
        // Create the workflow in the API if the id is not provided
        const workflow: WorkflowDetailDto = await http.post<WorkflowDetailDto>('/api/workflows', {
          body: JSON.stringify({ yaml: yamlString }),
        });

        // Report telemetry for workflow creation
        // Use workflow.definition from the created workflow if available, otherwise fall back to workflowDefinition from state
        telemetry.reportWorkflowCreated({
          workflowId: workflow.id,
          workflowDefinition: workflow.definition || workflowDefinition || undefined,
          error: undefined,
          editorType: 'yaml', // Saving YAML always comes from YAML editor
          origin: 'workflow_detail',
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
      const errorObj = error instanceof Error ? error : new Error(errorMessage);

      const errorState = getState();
      const errorWorkflowDefinition = selectWorkflowDefinition(errorState);
      const errorYamlString = selectYamlString(errorState);
      const errorOriginalWorkflow = selectWorkflow(errorState);
      const errorId = selectWorkflowId(errorState);

      // Report telemetry for failed operation
      if (errorId) {
        telemetry.reportWorkflowUpdated({
          workflowId: errorId,
          workflowUpdate: { yaml: errorYamlString },
          workflowDefinition: errorWorkflowDefinition || undefined,
          originalWorkflow: errorOriginalWorkflow?.definition || undefined,
          hasValidationErrors: false,
          validationErrorCount: 0,
          isBulkAction: false,
          error: errorObj,
          origin: 'workflow_detail',
        });
      } else {
        telemetry.reportWorkflowCreated({
          workflowDefinition: errorWorkflowDefinition || undefined,
          error: errorObj,
          origin: 'workflow_detail',
        });
      }

      notifications.toasts.addError(new Error(errorMessage), {
        title: i18n.translate('workflows.detail.saveYaml.error', {
          defaultMessage: 'Failed to save workflow',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
