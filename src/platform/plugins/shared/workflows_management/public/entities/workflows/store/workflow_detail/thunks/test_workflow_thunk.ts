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
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { selectWorkflow, selectYamlString } from '../selectors';

export interface TestWorkflowParams {
  inputs: Record<string, unknown>;
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
    const { http, notifications } = services;
    try {
      const yamlString = selectYamlString(getState());
      const workflow = selectWorkflow(getState());

      if (!yamlString) {
        return rejectWithValue('No YAML content to test');
      }

      const requestBody: Record<string, unknown> = {
        workflowYaml: yamlString,
        inputs,
      };

      if (workflow?.id) {
        requestBody.workflowId = workflow.id;
      }

      // Make the API call to test the workflow
      const response = await http.post<TestWorkflowResponse>(`/api/workflows/test`, {
        body: JSON.stringify(requestBody),
      });

      // Show success notification
      notifications.toasts.addSuccess(
        i18n.translate('workflows.detail.testWorkflow.success', {
          defaultMessage: 'Workflow test execution started',
        }),
        { toastLifeTimeMs: 2000 }
      );

      return response;
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to test workflow';

      notifications.toasts.addError(new Error(errorMessage), {
        title: i18n.translate('workflows.detail.testWorkflow.error', {
          defaultMessage: 'Failed to test workflow',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
