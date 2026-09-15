/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from 'redux-toolkit-v1';
import { i18n } from '@kbn/i18n';
import { WorkflowApi } from '@kbn/workflows-ui';
import { extractWorkflowMetadata } from '../../../../../common/lib/telemetry/utils/extract_workflow_metadata';
import { WorkflowsBaseTelemetry } from '../../../../../common/service/telemetry';
import type { WorkflowTriggerTab } from '../../../../../features/run_workflow/ui/types';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { selectWorkflow, selectWorkflowDefinition, selectYamlString } from '../selectors';

export interface TestWorkflowParams {
  inputs: Record<string, unknown>;
  triggerTab?: WorkflowTriggerTab;
}

// A single validation reason can be huge when it echoes a whole schema
// (e.g. the Elasticsearch `filter` union lists every query type). Cap each
// reason for the *displayed* toast body so it stays readable; the untruncated
// text is kept on the error object (see `buildValidationError`) so Kibana's
// "See the full error" modal can show and copy the complete reasons.
const MAX_REASON_LENGTH = 200;

const truncateReason = (reason: string): string =>
  reason.length > MAX_REASON_LENGTH ? `${reason.slice(0, MAX_REASON_LENGTH).trimEnd()}…` : reason;

const formatReasons = (reasons: string[], transform: (reason: string) => string): string =>
  reasons.map((reason) => `• ${transform(reason)}`).join('\n');

// Build an Error whose `message` is the trimmed, display-friendly text and
// whose `stack` carries the full untruncated reasons. Kibana's error toast
// renders `message` in the toast body and exposes `stack` in a copyable code
// block behind the "See the full error" button, so users get a compact toast
// but can still read/copy the complete validation output when needed.
const buildValidationError = (baseMessage: string, reasons: string[]): Error => {
  const displayMessage = `${baseMessage}:\n${formatReasons(reasons, truncateReason)}`;
  const fullMessage = `${baseMessage}:\n${formatReasons(reasons, (reason) => reason)}`;
  const error = new Error(displayMessage);
  error.stack = fullMessage;
  return error;
};

export interface TestWorkflowResponse {
  workflowExecutionId: string;
}

export const testWorkflowThunk = createAsyncThunk<
  TestWorkflowResponse,
  TestWorkflowParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/testWorkflowThunk',
  async ({ inputs, triggerTab }, { getState, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    const api = new WorkflowApi(http);
    const workflowsManagement = services.workflowsManagement;
    const telemetry = workflowsManagement?.telemetry
      ? new WorkflowsBaseTelemetry(workflowsManagement.telemetry)
      : null;

    try {
      const state = getState();
      const yamlString = selectYamlString(state);
      const workflow = selectWorkflow(state);
      const workflowDefinition = selectWorkflowDefinition(state);
      const { hasCustomEventTrigger } = extractWorkflowMetadata(workflowDefinition);

      if (!yamlString) {
        return rejectWithValue('No YAML content to test');
      }

      const response = await api.testWorkflow({
        workflowYaml: yamlString,
        workflowId: workflow?.id,
        inputs,
      });

      // Report telemetry for successful test run
      const inputCount = Object.keys(inputs).length;
      telemetry?.reportWorkflowTestRunInitiated({
        workflowId: workflow?.id,
        hasInputs: inputCount > 0,
        inputCount,
        error: undefined,
        editorType: 'yaml',
        origin: 'workflow_detail',
        triggerTab,
        hasCustomEventTrigger,
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
      // Extract error message from HTTP error body if available. Validation
      // failures carry the specific reasons under `body.attributes.validationErrors`
      // (e.g. "Parallel step ... has a branch body containing unsupported
      // flow-control"); surface those instead of the generic top-level message so
      // the user sees *why* the workflow is invalid, not just that it is. Kibana's
      // error-response schema strips unknown top-level fields, so the reasons are
      // carried under the schema-allowed `attributes`.
      const baseMessage = error.body?.message || error.message || 'Failed to test workflow';
      const validationErrors: string[] | undefined =
        error.body?.attributes?.validationErrors ?? error.body?.validationErrors;
      const errorObj =
        Array.isArray(validationErrors) && validationErrors.length > 0
          ? buildValidationError(baseMessage, validationErrors)
          : error instanceof Error
          ? error
          : new Error(baseMessage);
      // Displayed toast body (trimmed for validation errors, plain otherwise).
      const errorMessage = errorObj.message;

      const errorState = getState();
      const workflow = selectWorkflow(errorState);
      const workflowDefinition = selectWorkflowDefinition(errorState);
      const { hasCustomEventTrigger } = extractWorkflowMetadata(workflowDefinition);
      const inputCount = Object.keys(inputs).length;

      // Report telemetry for failed test run
      telemetry?.reportWorkflowTestRunInitiated({
        workflowId: workflow?.id,
        hasInputs: inputCount > 0,
        inputCount,
        error: errorObj,
        origin: 'workflow_detail',
        editorType: 'yaml',
        triggerTab,
        hasCustomEventTrigger,
      });

      notifications.toasts.addError(errorObj, {
        title: i18n.translate('workflows.detail.testWorkflow.error', {
          defaultMessage: 'Failed to test workflow',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
