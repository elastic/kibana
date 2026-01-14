/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import type { YamlValidationResult } from '../../features/validate_workflow_yaml/model/types';
import {
  workflowEventNames,
  WorkflowExecutionEventTypes,
  WorkflowLifecycleEventTypes,
  WorkflowUIEventTypes,
  WorkflowValidationEventTypes,
} from '../lib/telemetry/events/workflows';
import type {
  WorkflowEditorType,
  WorkflowUpdateType,
  WorkflowValidationErrorType,
} from '../lib/telemetry/events/workflows/types';
import type { TelemetryServiceStart } from '../lib/telemetry/types';
import {
  extractStepInfoFromWorkflowYaml,
  extractWorkflowMetadata,
} from '../lib/telemetry/utils/extract_workflow_metadata';

export class WorkflowsBaseTelemetry {
  // Track reported validation errors per workflow ID
  private reportedValidationErrors = new Map<string | undefined, Set<string>>();

  constructor(protected readonly telemetryService: TelemetryServiceStart) {}

  protected getBaseResultParams = (
    error: Error | undefined
  ): { result: 'success' | 'failed'; errorMessage?: string } => ({
    result: error ? 'failed' : 'success',
    ...(error && { errorMessage: error.message }),
  });

  // Workflow lifecycle actions

  /**
   * Reports a workflow creation attempt.
   * Call this AFTER the creation request completes (in both success and error cases).
   *
   * @param params.workflowDefinition - Optional workflow definition to extract metadata from.
   *                                    If provided, metadata (stepCount, connectorTypes, etc.) will be automatically extracted.
   */
  reportWorkflowCreated = (params: {
    workflowId?: string;
    error?: Error;
    editorType?: WorkflowEditorType;
    workflowDefinition?: Partial<WorkflowYaml> | null;
  }) => {
    const { workflowId, error, editorType, workflowDefinition } = params;

    // Extract metadata from workflow definition if provided
    const metadata = workflowDefinition ? extractWorkflowMetadata(workflowDefinition) : undefined;

    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowCreated, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowCreated],
      workflowId,
      ...(editorType && { editorType }),
      ...(metadata && {
        enabled: metadata.enabled,
        stepCount: metadata.stepCount,
        connectorTypes: metadata.connectorTypes,
        stepTypeCounts: metadata.stepTypeCounts,
        hasScheduledTriggers: metadata.hasScheduledTriggers,
        hasAlertTriggers: metadata.hasAlertTriggers,
        hasTimeout: metadata.hasTimeout,
        hasConcurrency: metadata.hasConcurrency,
        ...(metadata.concurrencyMax !== undefined && { concurrencyMax: metadata.concurrencyMax }),
        ...(metadata.concurrencyStrategy && { concurrencyStrategy: metadata.concurrencyStrategy }),
        hasOnFailure: metadata.hasOnFailure,
      }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Determines the update type from the workflow update object.
   * This logic is centralized in the telemetry layer for better separation of concerns.
   */
  private determineUpdateType = (
    workflow: Partial<{
      yaml?: string;
      enabled?: boolean;
      tags?: unknown;
      description?: string;
      name?: string;
    }>
  ): WorkflowUpdateType => {
    if (workflow.yaml !== undefined) {
      return 'yaml';
    }
    if (workflow.enabled !== undefined) {
      return 'enabled';
    }
    if (workflow.tags !== undefined) {
      return 'tags';
    }
    if (workflow.description !== undefined) {
      return 'description';
    }
    // name or other metadata fields
    return 'metadata';
  };

  /**
   * Reports a workflow update attempt.
   * Call this AFTER the update request completes (in both success and error cases).
   * The telemetry service automatically determines the update type and publishes the appropriate event:
   * - For enable/disable actions, publishes WorkflowEnabledStateChanged
   * - For all other updates, publishes WorkflowUpdated
   */
  reportWorkflowUpdated = (params: {
    workflowId: string;
    workflowUpdate: Partial<{
      yaml?: string;
      enabled?: boolean;
      tags?: unknown;
      description?: string;
      name?: string;
    }>;
    workflowDefinition?: Partial<WorkflowYaml> | null;
    hasValidationErrors: boolean;
    validationErrorCount: number;
    validationErrorTypes?: string[];
    error?: Error;
    editorType?: WorkflowEditorType;
    isBulkAction?: boolean;
  }) => {
    const {
      workflowId,
      workflowUpdate,
      workflowDefinition,
      hasValidationErrors,
      validationErrorCount,
      validationErrorTypes,
      error,
      editorType,
      isBulkAction = false,
    } = params;

    // For enable/disable actions, use the specific event instead of the general update event
    if (workflowUpdate.enabled !== undefined) {
      this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged, {
        eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged],
        workflowId,
        enabled: workflowUpdate.enabled,
        isBulkAction,
        ...(editorType && { editorType }),
        ...this.getBaseResultParams(error),
      });
      return;
    }

    // For all other updates, use the general update event
    // Determine update type from the update object (centralized in telemetry layer)
    const updateType = this.determineUpdateType(workflowUpdate);

    // Extract metadata if workflow definition is provided
    const metadata = workflowDefinition ? extractWorkflowMetadata(workflowDefinition) : undefined;

    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowUpdated, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowUpdated],
      workflowId,
      updateType,
      hasValidationErrors,
      validationErrorCount,
      ...(validationErrorTypes && { validationErrorTypes }),
      ...(editorType && { editorType }),
      ...(metadata && {
        enabled: metadata.enabled,
        stepCount: metadata.stepCount,
        connectorTypes: metadata.connectorTypes,
        stepTypeCounts: metadata.stepTypeCounts,
        hasScheduledTriggers: metadata.hasScheduledTriggers,
        hasAlertTriggers: metadata.hasAlertTriggers,
        inputCount: metadata.inputCount,
        triggerCount: metadata.triggerCount,
        hasTimeout: metadata.hasTimeout,
        hasConcurrency: metadata.hasConcurrency,
        concurrencyMax: metadata.concurrencyMax,
        concurrencyStrategy: metadata.concurrencyStrategy,
        hasOnFailure: metadata.hasOnFailure,
      }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow deletion attempt.
   * Call this AFTER the deletion request completes (in both success and error cases).
   */
  reportWorkflowDeleted = (params: {
    workflowIds: string[];
    isBulkDelete: boolean;
    error?: Error;
  }) => {
    const { workflowIds, isBulkDelete, error } = params;
    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowDeleted, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowDeleted],
      workflowIds,
      isBulkDelete,
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow clone attempt.
   * Call this AFTER the clone request completes (in both success and error cases).
   */
  reportWorkflowCloned = (params: {
    sourceWorkflowId: string;
    newWorkflowId?: string;
    error?: Error;
    editorType?: WorkflowEditorType;
  }) => {
    const { sourceWorkflowId, newWorkflowId, error, editorType } = params;
    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowCloned, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowCloned],
      sourceWorkflowId,
      ...(newWorkflowId && { newWorkflowId }),
      ...(editorType && { editorType }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow enabled state change attempt (enable or disable).
   * Call this AFTER the state change request completes (in both success and error cases).
   */
  reportWorkflowEnabledStateChanged = (params: {
    workflowId: string;
    enabled: boolean;
    isBulkAction: boolean;
    error?: Error;
    editorType?: WorkflowEditorType;
  }) => {
    const { workflowId, enabled, isBulkAction, error, editorType } = params;
    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged],
      workflowId,
      enabled,
      isBulkAction,
      ...(editorType && { editorType }),
      ...this.getBaseResultParams(error),
    });
  };

  // Validation actions

  /**
   * Reports workflow validation errors.
   * Call this when validation errors occur during workflow creation or update.
   * All errors are reported in a single event.
   *
   * @param params.validationResults - Array of all validation results.
   *                                   The telemetry service filters for errors, handles deduplication, and extracts error types.
   */
  reportWorkflowValidationError = (params: {
    workflowId?: string;
    validationResults: YamlValidationResult[];
    editorType?: WorkflowEditorType;
  }) => {
    const { workflowId, validationResults, editorType } = params;

    // Filter for errors only
    const errorResults = validationResults.filter((result) => result.severity === 'error');

    // Get or create the set of reported errors for this workflow
    let workflowReportedErrors = this.reportedValidationErrors.get(workflowId);
    if (!workflowReportedErrors) {
      workflowReportedErrors = new Set<string>();
      this.reportedValidationErrors.set(workflowId, workflowReportedErrors);
    }

    // Find new errors that haven't been reported yet for this workflow
    const newErrorResults = errorResults.filter((result) => {
      const errorKey = `${result.owner}-${result.startLineNumber}-${result.startColumn}-${result.message}`;
      return !workflowReportedErrors.has(errorKey);
    });

    // If there are new errors, report them
    if (newErrorResults.length > 0) {
      // Deduplicate by owner and message, then extract unique error types
      const uniqueErrorTypes = new Set<WorkflowValidationErrorType>();
      for (const result of newErrorResults) {
        uniqueErrorTypes.add(result.owner as WorkflowValidationErrorType);
      }

      const errorTypes = Array.from(uniqueErrorTypes);
      const errorCount = newErrorResults.length;

      this.telemetryService.reportEvent(WorkflowValidationEventTypes.WorkflowValidationError, {
        eventName: workflowEventNames[WorkflowValidationEventTypes.WorkflowValidationError],
        ...(workflowId && { workflowId }),
        errorTypes,
        errorCount,
        ...(editorType && { editorType }),
      });

      // Track reported errors for this workflow
      newErrorResults.forEach((result) => {
        const errorKey = `${result.owner}-${result.startLineNumber}-${result.startColumn}-${result.message}`;
        workflowReportedErrors.add(errorKey);
      });
    }

    // Clear reported errors that are no longer present for this workflow
    const currentErrorKeys = new Set(
      errorResults.map(
        (result) =>
          `${result.owner}-${result.startLineNumber}-${result.startColumn}-${result.message}`
      )
    );
    const updatedReportedErrors = new Set(
      Array.from(workflowReportedErrors).filter((key) => currentErrorKeys.has(key))
    );
    this.reportedValidationErrors.set(workflowId, updatedReportedErrors);
  };

  // Execution initiation actions

  /**
   * Reports a workflow test run initiation.
   * Call this AFTER the test run request completes (in both success and error cases).
   */
  reportWorkflowTestRunInitiated = (params: {
    workflowId?: string;
    hasInputs: boolean;
    inputCount: number;
    error?: Error;
    editorType?: WorkflowEditorType;
  }) => {
    const { workflowId, hasInputs, inputCount, error, editorType } = params;
    this.telemetryService.reportEvent(WorkflowExecutionEventTypes.WorkflowTestRunInitiated, {
      eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowTestRunInitiated],
      ...(workflowId && { workflowId }),
      hasInputs,
      inputCount,
      ...(editorType && { editorType }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow step test run initiation.
   * Call this AFTER the step test run request completes (in both success and error cases).
   *
   * @param params.workflowYaml - The workflow YAML string to extract step information from
   * @param params.stepId - The step ID (name) to find and report
   */
  reportWorkflowStepTestRunInitiated = (params: {
    workflowYaml?: string | null;
    stepId: string;
    error?: Error;
    editorType?: WorkflowEditorType;
  }) => {
    const { workflowYaml, stepId, error, editorType } = params;

    // Extract step information from workflow YAML
    const stepInfo = workflowYaml ? extractStepInfoFromWorkflowYaml(workflowYaml, stepId) : null;

    const stepType = stepInfo?.stepType || 'unknown';
    const connectorType = stepInfo?.connectorType;
    const workflowId = stepInfo?.workflowId;

    this.telemetryService.reportEvent(WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated, {
      eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated],
      ...(workflowId && { workflowId }),
      stepId,
      stepType,
      ...(connectorType && { connectorType }),
      ...(editorType && { editorType }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow manual run initiation.
   * Call this AFTER the run request completes (in both success and error cases).
   */
  reportWorkflowRunInitiated = (params: {
    workflowId: string;
    hasInputs: boolean;
    inputCount: number;
    error?: Error;
    editorType?: WorkflowEditorType;
  }) => {
    const { workflowId, hasInputs, inputCount, error, editorType } = params;
    this.telemetryService.reportEvent(WorkflowExecutionEventTypes.WorkflowRunInitiated, {
      eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowRunInitiated],
      workflowId,
      hasInputs,
      inputCount,
      ...(editorType && { editorType }),
      ...this.getBaseResultParams(error),
    });
  };

  // UI interaction actions

  /**
   * Reports a workflow search action.
   * The telemetry service extracts filter information from the search params.
   */
  reportWorkflowSearched = (params: {
    search: { query?: string; [key: string]: unknown };
    resultCount: number;
  }) => {
    const { search, resultCount } = params;

    // Extract query and filter information
    const hasQuery = Boolean(search.query);
    // Exclude size, page, and query from filterTypes and detect filter fields (array properties with length > 0)
    const filterTypes = Object.entries(search)
      .filter(
        ([key, value]) =>
          !['size', 'page', 'query'].includes(key) && Array.isArray(value) && value.length > 0
      )
      .map(([key]) => key);
    const hasFilters = filterTypes.length > 0;

    this.telemetryService.reportEvent(WorkflowUIEventTypes.WorkflowSearched, {
      eventName: workflowEventNames[WorkflowUIEventTypes.WorkflowSearched],
      hasQuery,
      hasFilters,
      ...(filterTypes.length > 0 && { filterTypes }),
      resultCount,
    });
  };

  /**
   * Reports a workflow list page view.
   */
  reportWorkflowListViewed = (params: { workflowCount: number; pageNumber: number }) => {
    const { workflowCount, pageNumber } = params;
    this.telemetryService.reportEvent(WorkflowUIEventTypes.WorkflowListViewed, {
      eventName: workflowEventNames[WorkflowUIEventTypes.WorkflowListViewed],
      workflowCount,
      pageNumber,
    });
  };

  /**
   * Reports a workflow detail page view.
   */
  reportWorkflowDetailViewed = (params: {
    workflowId: string;
    tab: 'workflow' | 'executions' | 'logs';
    editorType?: WorkflowEditorType;
  }) => {
    const { workflowId, tab, editorType } = params;
    this.telemetryService.reportEvent(WorkflowUIEventTypes.WorkflowDetailViewed, {
      eventName: workflowEventNames[WorkflowUIEventTypes.WorkflowDetailViewed],
      workflowId,
      tab,
      ...(editorType && { editorType }),
    });
  };
}
