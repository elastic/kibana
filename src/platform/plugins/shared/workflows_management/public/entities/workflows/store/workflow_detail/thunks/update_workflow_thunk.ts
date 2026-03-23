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
import type { EsWorkflow } from '@kbn/workflows';
import { loadWorkflowThunk } from './load_workflow_thunk';
import { affectsYamlMetadata, updateWorkflowYamlFields } from '../../../../../../common/lib/yaml';
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
import { setYamlString, updateWorkflow } from '../slice';

export interface UpdateWorkflowParams {
  workflow: Partial<EsWorkflow>;
}

export type UpdateWorkflowResponse = void;

export const updateWorkflowThunk = createAsyncThunk<
  UpdateWorkflowResponse,
  UpdateWorkflowParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/updateWorkflowThunk',
  async ({ workflow }, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    const state = getState();
    const id = selectWorkflowId(state);
    const workflowDefinition = selectWorkflowDefinition(state);

    // Initialize telemetry
    const workflowsManagement = services.workflowsManagement;
    const telemetry = workflowsManagement?.telemetry
      ? new WorkflowsBaseTelemetry(workflowsManagement.telemetry)
      : null;

    try {
      if (!id) {
        throw new Error('No workflow ID to update');
      }

      // Make the API call to update the workflow
      await http.put<void>(`/api/workflows/${id}`, {
        body: JSON.stringify(workflow),
      });

      // Get original workflow state for comparison
      const originalWorkflow = selectWorkflow(state);

      // Report telemetry for successful update
      // The telemetry service automatically determines editorType based on update fields
      telemetry?.reportWorkflowUpdated({
        workflowId: id,
        workflowUpdate: workflow,
        workflowDefinition: workflowDefinition || undefined,
        originalWorkflow: originalWorkflow?.definition || undefined,
        hasValidationErrors: false,
        validationErrorCount: 0,
        isBulkAction: false,
        error: undefined,
        origin: 'workflow_detail',
      });

      // Invalidate relevant queries from react-query cache
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id] });

      // If the update affects YAML, update content in the editor immediately
      // for better UX, then reload from server to sync
      if (affectsYamlMetadata(workflow)) {
        const currentYaml = selectYamlString(state);

        let updatedYaml: string = currentYaml;

        if (currentYaml) {
          // Update all fields that were changed, preserving formatting (optimistic update)
          updatedYaml = updateWorkflowYamlFields(currentYaml, workflow, workflow.enabled);
          dispatch(setYamlString(updatedYaml));
        }

        // Also update the workflow object in the store
        dispatch(updateWorkflow({ ...workflow, yaml: updatedYaml }));

        // Reload the workflow from server to sync
        await dispatch(loadWorkflowThunk({ id }));
      } else {
        dispatch(updateWorkflow(workflow));
      }

      // Show success notification
      notifications.toasts.addSuccess(
        i18n.translate('workflows.detail.updateWorkflow.success', {
          defaultMessage: 'Workflow updated',
        }),
        { toastLifeTimeMs: 2000 }
      );
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to update workflow';
      const errorObj = error instanceof Error ? error : new Error(errorMessage);

      // Report telemetry for failed update
      if (id) {
        const originalWorkflow = selectWorkflow(state);
        telemetry?.reportWorkflowUpdated({
          workflowId: id,
          workflowUpdate: workflow,
          workflowDefinition: workflowDefinition || undefined,
          originalWorkflow: originalWorkflow?.definition || undefined,
          hasValidationErrors: false,
          validationErrorCount: 0,
          isBulkAction: false,
          error: errorObj,
          origin: 'workflow_detail',
        });
      }

      notifications.toasts.addError(new Error(errorMessage), {
        title: i18n.translate('workflows.detail.updateWorkflow.error', {
          defaultMessage: 'Failed to update workflow',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
