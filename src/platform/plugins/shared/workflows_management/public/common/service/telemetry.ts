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
import type { WorkflowTriggerTab } from '../lib/telemetry/events/workflows/execution/types';
import type {
  WorkflowEditorType,
  WorkflowTelemetryOrigin,
} from '../lib/telemetry/events/workflows/types';
import type { WorkflowDetailTab } from '../lib/telemetry/events/workflows/ui/types';
import type { WorkflowValidationErrorType } from '../lib/telemetry/events/workflows/validation/types';
import type { TelemetryServiceClient } from '../lib/telemetry/types';
import {
  extractStepInfoFromWorkflowYaml,
  extractWorkflowMetadata,
} from '../lib/telemetry/utils/extract_workflow_metadata';

export class WorkflowsBaseTelemetry {
  // Track reported validation errors per workflow ID
  private reportedValidationErrors = new Map<string | undefined, Set<string>>();

  constructor(protected readonly telemetryService: TelemetryServiceClient) {}

  protected getBaseResultParams = (
    error: Error | undefined
  ): { result: 'success' | 'failed'; errorMessage?: string } => ({
    result: error ? 'failed' : 'success',
    ...(error && { errorMessage: error.message }),
  });

  // Workflow lifecycle actions

  /**
   * Reports a workflow creation attempt.
   *
   * @param params.workflowDefinition - Optional workflow definition to extract metadata from.
   *                                    If provided, metadata (stepCount, connectorTypes, etc.) will be automatically extracted.
   */
  reportWorkflowCreated = (params: {
    workflowId?: string;
    error?: Error;
    editorType?: WorkflowEditorType;
    workflowDefinition?: Partial<WorkflowYaml> | null;
    origin?: WorkflowTelemetryOrigin;
  }) => {
    const { workflowId, error, editorType, workflowDefinition, origin } = params;

    // Always extract metadata - extractWorkflowMetadata returns defaults if workflowDefinition is null/undefined
    const metadata = extractWorkflowMetadata(workflowDefinition);

    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowCreated, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowCreated],
      workflowId,
      ...(editorType && { editorType }),
      ...(origin && { origin }),
      enabled: metadata.enabled,
      stepCount: metadata.stepCount,
      connectorTypes: metadata.connectorTypes,
      stepTypes: metadata.stepTypes,
      stepTypeCounts: metadata.stepTypeCounts,
      triggerTypes: metadata.triggerTypes,
      ...(metadata.concurrencyMax !== undefined && { concurrencyMax: metadata.concurrencyMax }),
      ...(metadata.concurrencyStrategy && { concurrencyStrategy: metadata.concurrencyStrategy }),
      settingsUsed: metadata.settingsUsed,
      hasDescription: metadata.hasDescription,
      tagCount: metadata.tagCount,
      constCount: metadata.constCount,
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow update attempt.
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
    originalWorkflow?: Partial<WorkflowYaml> | null;
    hasValidationErrors: boolean;
    validationErrorCount: number;
    validationErrorTypes?: string[];
    error?: Error;
    editorType?: WorkflowEditorType;
    isBulkAction?: boolean;
    bulkActionCount?: number;
    origin?: WorkflowTelemetryOrigin;
  }) => {
    const {
      workflowId,
      workflowUpdate,
      workflowDefinition,
      originalWorkflow,
      hasValidationErrors,
      validationErrorCount,
      validationErrorTypes,
      error,
      editorType,
      isBulkAction = false,
      origin,
    } = params;

    // Check if enabled changed (directly or via YAML update)
    const enabledChanged =
      workflowUpdate.enabled !== undefined ||
      (workflowUpdate.yaml !== undefined &&
        originalWorkflow?.enabled !== undefined &&
        workflowDefinition?.enabled !== undefined &&
        originalWorkflow.enabled !== workflowDefinition.enabled);

    // Determine editorType: 'yaml' if yaml is in update, otherwise use provided or default to 'ui'
    const finalEditorType: WorkflowEditorType | undefined =
      workflowUpdate.yaml !== undefined
        ? 'yaml'
        : editorType || (origin === 'workflow_detail' ? 'ui' : undefined);

    // Build updatedFields list (simple: just the keys in workflowUpdate)
    const updatedFields = Object.keys(workflowUpdate);

    // Report enabled state changed event if enabled was modified
    if (enabledChanged) {
      const enabledValue = workflowUpdate.enabled ?? workflowDefinition?.enabled;
      if (enabledValue !== undefined) {
        this.reportWorkflowEnabledStateChanged({
          workflowId,
          enabled: enabledValue,
          isBulkAction,
          ...(isBulkAction &&
            params.bulkActionCount !== undefined && {
              bulkActionCount: params.bulkActionCount,
            }),
          ...(finalEditorType && { editorType: finalEditorType }),
          ...(origin && { origin }),
          error,
        });
        return;
      }
    }

    // Report general workflow updated event
    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowUpdated, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowUpdated],
      workflowId,
      hasValidationErrors,
      validationErrorCount,
      ...(validationErrorTypes && { validationErrorTypes }),
      ...(finalEditorType && { editorType: finalEditorType }),
      ...(origin && { origin }),
      ...(updatedFields.length > 0 && { updatedFields }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow deletion attempt.
   */
  reportWorkflowDeleted = (params: {
    workflowIds: string[];
    isBulkDelete: boolean;
    error?: Error;
    origin?: WorkflowTelemetryOrigin;
  }) => {
    const { workflowIds, isBulkDelete, error, origin } = params;
    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowDeleted, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowDeleted],
      workflowIds,
      isBulkDelete,
      ...(origin && { origin }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow clone attempt.
   */
  reportWorkflowCloned = (params: {
    sourceWorkflowId: string;
    newWorkflowId?: string;
    error?: Error;
    editorType?: WorkflowEditorType;
    origin?: WorkflowTelemetryOrigin;
  }) => {
    const { sourceWorkflowId, newWorkflowId, error, editorType, origin } = params;
    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowCloned, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowCloned],
      sourceWorkflowId,
      ...(newWorkflowId && { newWorkflowId }),
      ...(editorType && { editorType }),
      ...(origin && { origin }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow enabled state change attempt (enable or disable).
   */
  reportWorkflowEnabledStateChanged = (params: {
    workflowId: string;
    enabled: boolean;
    isBulkAction: boolean;
    bulkActionCount?: number;
    error?: Error;
    editorType?: WorkflowEditorType;
    origin?: WorkflowTelemetryOrigin;
  }) => {
    const { workflowId, enabled, isBulkAction, bulkActionCount, error, editorType, origin } =
      params;
    this.telemetryService.reportEvent(WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged, {
      eventName: workflowEventNames[WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged],
      workflowId,
      enabled,
      isBulkAction,
      ...(bulkActionCount !== undefined && {
        bulkActionCount,
      }),
      ...(editorType && { editorType }),
      ...(origin && { origin }),
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
    origin?: WorkflowTelemetryOrigin;
  }) => {
    const { workflowId, validationResults, editorType, origin } = params;

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
        ...(origin && { origin }),
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
   */
  reportWorkflowTestRunInitiated = (params: {
    workflowId?: string;
    hasInputs: boolean;
    inputCount: number;
    error?: Error;
    editorType?: WorkflowEditorType;
    origin?: WorkflowTelemetryOrigin;
    triggerTab?: WorkflowTriggerTab;
  }) => {
    const { workflowId, hasInputs, inputCount, error, editorType, origin, triggerTab } = params;
    this.telemetryService.reportEvent(WorkflowExecutionEventTypes.WorkflowTestRunInitiated, {
      eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowTestRunInitiated],
      ...(workflowId && { workflowId }),
      hasInputs,
      inputCount,
      ...(editorType && { editorType }),
      ...(origin && { origin }),
      ...(triggerTab && { triggerTab }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow step test run initiation.
   *
   * @param params.workflowYaml - The workflow YAML string to extract step information from
   * @param params.stepId - The step ID (name) to find and report
   */
  reportWorkflowStepTestRunInitiated = (params: {
    workflowYaml?: string | null;
    stepId: string;
    error?: Error;
    editorType?: WorkflowEditorType;
    origin?: WorkflowTelemetryOrigin;
  }) => {
    const { workflowYaml, stepId, error, editorType, origin } = params;

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
      ...(origin && { origin }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow manual run initiation.
   */
  reportWorkflowRunInitiated = (params: {
    workflowId: string;
    hasInputs: boolean;
    inputCount: number;
    error?: Error;
    editorType?: WorkflowEditorType;
    origin?: WorkflowTelemetryOrigin;
    triggerTab?: WorkflowTriggerTab;
  }) => {
    const { workflowId, hasInputs, inputCount, error, editorType, origin, triggerTab } = params;
    this.telemetryService.reportEvent(WorkflowExecutionEventTypes.WorkflowRunInitiated, {
      eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowRunInitiated],
      workflowId,
      hasInputs,
      inputCount,
      ...(editorType && { editorType }),
      ...(origin && { origin }),
      ...(triggerTab && { triggerTab }),
      ...this.getBaseResultParams(error),
    });
  };

  /**
   * Reports a workflow run cancellation request.
   */
  reportWorkflowRunCancelled = (params: {
    workflowExecutionId: string;
    workflowId?: string;
    timeToCancellation?: number;
    error?: Error;
    origin?: WorkflowTelemetryOrigin;
  }) => {
    const { workflowExecutionId, workflowId, timeToCancellation, error, origin } = params;
    this.telemetryService.reportEvent(WorkflowExecutionEventTypes.WorkflowRunCancelled, {
      eventName: workflowEventNames[WorkflowExecutionEventTypes.WorkflowRunCancelled],
      workflowExecutionId,
      ...(workflowId && { workflowId }),
      ...(timeToCancellation !== undefined && { timeToCancellation }),
      ...(origin && { origin }),
      ...this.getBaseResultParams(error),
    });
  };

  // UI interaction actions

  /**
   * Reports a workflow list page view.
   * This event tracks list page views, pagination, and search/filter usage patterns.
   */
  reportWorkflowListViewed = (params: {
    workflowCount: number;
    pageNumber: number;
    search: { query?: string; [key: string]: unknown };
  }) => {
    const { workflowCount, pageNumber, search } = params;

    // Build filterTypes array - includes "query" if search query is used, plus any filter fields
    const filterTypes: string[] = [];

    // Add "query" if a search query is provided
    if (search.query) {
      filterTypes.push('query');
    }

    // Add filter fields (array properties with length > 0, excluding size, page, query)
    Object.entries(search)
      .filter(
        ([key, value]) =>
          !['size', 'page', 'query'].includes(key) && Array.isArray(value) && value.length > 0
      )
      .forEach(([key]) => filterTypes.push(key));

    this.telemetryService.reportEvent(WorkflowUIEventTypes.WorkflowListViewed, {
      eventName: workflowEventNames[WorkflowUIEventTypes.WorkflowListViewed],
      workflowCount,
      pageNumber,
      ...(filterTypes.length > 0 && { filterTypes }),
    });
  };

  /**
   * Reports a workflow detail page view.
   */
  reportWorkflowDetailViewed = (params: {
    workflowId: string;
    tab: WorkflowDetailTab;
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
