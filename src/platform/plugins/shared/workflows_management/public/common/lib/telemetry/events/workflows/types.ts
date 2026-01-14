/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/public';
import type {
  ReportWorkflowRunInitiatedActionParams,
  ReportWorkflowStepTestRunInitiatedActionParams,
  ReportWorkflowTestRunInitiatedActionParams,
  WorkflowExecutionEventTypes,
} from './execution/types';
import type {
  ReportWorkflowClonedActionParams,
  ReportWorkflowDeletedActionParams,
  ReportWorkflowEnabledStateChangedActionParams,
  ReportWorkflowUpdatedActionParams,
  WorkflowLifecycleEventTypes,
} from './lifecycle/types';
import type {
  ReportWorkflowDetailViewedActionParams,
  ReportWorkflowListViewedActionParams,
  ReportWorkflowSearchedActionParams,
  WorkflowUIEventTypes,
} from './ui/types';
import type {
  ReportWorkflowValidationErrorActionParams,
  WorkflowValidationEventTypes,
} from './validation/types';

// Re-export all event types from subcategories
export {
  WorkflowLifecycleEventTypes,
  type WorkflowUpdateType,
  type ReportWorkflowCreatedActionParams,
  type ReportWorkflowUpdatedActionParams,
  type ReportWorkflowDeletedActionParams,
  type ReportWorkflowClonedActionParams,
  type ReportWorkflowEnabledStateChangedActionParams,
} from './lifecycle/types';

export {
  WorkflowValidationEventTypes,
  type WorkflowValidationErrorType,
  type ReportWorkflowValidationErrorActionParams,
} from './validation/types';

export {
  WorkflowExecutionEventTypes,
  type WorkflowTriggerType,
  type ReportWorkflowTestRunInitiatedActionParams,
  type ReportWorkflowStepTestRunInitiatedActionParams,
  type ReportWorkflowRunInitiatedActionParams,
} from './execution/types';

export {
  WorkflowUIEventTypes,
  type WorkflowDetailTab,
  type ReportWorkflowSearchedActionParams,
  type ReportWorkflowListViewedActionParams,
  type ReportWorkflowDetailViewedActionParams,
} from './ui/types';

/**
 * Base parameters for all workflow telemetry events that represent user actions/requests.
 * These events track both successful and failed attempts, as the outcome is determined
 * by the server response.
 */
export interface BaseResultActionParams {
  /**
   * Indicates whether the action succeeded or failed.
   * 'success' means the server request completed successfully.
   * 'failed' means the server request failed (validation error, network error, etc.).
   */
  result: 'success' | 'failed';
  /**
   * Error message if the action failed. Only present when result is 'failed'.
   */
  errorMessage?: string;
}

/**
 * Editor context for events that occur from the workflow detail page.
 * This helps track which editor interface users prefer when performing actions.
 */
export type WorkflowEditorType = 'yaml' | 'visual' | 'both' | 'execution_graph';

/**
 * Base parameters for events that can include editor context.
 * Only include editorType when the action originates from the workflow detail page.
 */
export interface BaseEditorContextParams {
  /**
   * The editor type(s) visible/active when the action was performed.
   * - 'yaml': Only YAML editor was visible
   * - 'visual': Only visual editor was visible
   * - 'both': Both YAML and visual editors were visible
   * - 'execution_graph': Execution graph was visible
   * - undefined: Action did not originate from workflow detail page (e.g., from list page, API, etc.)
   */
  editorType?: WorkflowEditorType;
}

export interface WorkflowsTelemetryEventsMap {
  [WorkflowLifecycleEventTypes.WorkflowCreated]: ReportWorkflowCreatedActionParams;
  [WorkflowLifecycleEventTypes.WorkflowUpdated]: ReportWorkflowUpdatedActionParams;
  [WorkflowLifecycleEventTypes.WorkflowDeleted]: ReportWorkflowDeletedActionParams;
  [WorkflowLifecycleEventTypes.WorkflowCloned]: ReportWorkflowClonedActionParams;
  [WorkflowLifecycleEventTypes.WorkflowEnabledStateChanged]: ReportWorkflowEnabledStateChangedActionParams;
  [WorkflowValidationEventTypes.WorkflowValidationError]: ReportWorkflowValidationErrorActionParams;
  [WorkflowExecutionEventTypes.WorkflowTestRunInitiated]: ReportWorkflowTestRunInitiatedActionParams;
  [WorkflowExecutionEventTypes.WorkflowStepTestRunInitiated]: ReportWorkflowStepTestRunInitiatedActionParams;
  [WorkflowExecutionEventTypes.WorkflowRunInitiated]: ReportWorkflowRunInitiatedActionParams;
  [WorkflowUIEventTypes.WorkflowSearched]: ReportWorkflowSearchedActionParams;
  [WorkflowUIEventTypes.WorkflowListViewed]: ReportWorkflowListViewedActionParams;
  [WorkflowUIEventTypes.WorkflowDetailViewed]: ReportWorkflowDetailViewedActionParams;
}

export type AllWorkflowEventTypes =
  | WorkflowLifecycleEventTypes
  | WorkflowValidationEventTypes
  | WorkflowExecutionEventTypes
  | WorkflowUIEventTypes;

export interface WorkflowsTelemetryEvent {
  eventType: AllWorkflowEventTypes;
  schema: RootSchema<WorkflowsTelemetryEventsMap[AllWorkflowEventTypes]>;
}
