/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Feature ID for the workflows management feature
 */
export const WORKFLOWS_MANAGEMENT_FEATURE_ID = 'workflowsManagement';

/**
 * UI Setting ID for enabling / disabling the workflows management UI
 */
export const WORKFLOWS_UI_SETTING_ID = 'workflows:ui:enabled';
export const WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID = 'workflows:experimentalFeatures';
export const WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID = 'workflows:ui:executionGraph:enabled';
export const WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID = 'workflows:ui:showExecutor:enabled';
export const WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID = 'workflows:ui:showManagedWorkflows';

/**
 * Feature flag ID for enabling / disabling the workflow execution stats bar UI
 */
export const WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID = 'workflows:executionStatsBar:enabled';

/**
 * Global Advanced Setting gating the Workflow Template Library tech preview.
 *
 * Registered as a global uiSetting (not per-space) so the same toggle is
 * readable from both the server runtime (cache refresh + route handlers) and
 * any browser plugin that consumes `@kbn/workflows-library` without taking a
 * runtime dep on `workflows_management`.
 */
export const WORKFLOWS_LIBRARY_ENABLED_SETTING_ID = 'workflowsManagement:library:enabled';

/**
 * Global Advanced Setting gating the global Workflow Executions view
 * (`/app/workflows/executions`).
 *
 * Registered as a global uiSetting (not per-space) so the same toggle is
 * readable from any browser plugin that consumes the workflows UI without
 * taking a runtime dep on `workflows_management`.
 */
export const WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID =
  'workflowsManagement:globalExecutionsView:enabled';

/**
 * Max length for YAML `connector-id` (triggers, steps, HITL channels) and reported
 * connector ids. Covers Actions saved-object ids, user-friendly aliases, and HITL
 * connector names.
 */
export const CONNECTOR_ID_MAX_LENGTH = 512;

/**
 * Upper bound on a KQL condition (step `if` and trigger `on.condition`).
 * The parser recurses, so nesting depth has to stay well inside the stack limit.
 * A longer expression can be hoisted into a `data.set` step and compared as a short flag.
 */
export const IF_CONDITION_MAX_LENGTH = 2000;

/**
 * Map of regular (saved object) connector types -> their system connector equivalents.
 * Use this map to make the `connector-id` step config property optional for a given connector step type, allowing it to be executed via its linked system connector.
 * Pre-requisite for this to work:
 * - System connectors have empty config/secrets schemas. Make sure these system connectors are able to execute by receiving params alone.
 */
export const SystemConnectorsMap = new Map<string, string>([['.http', '.http-system']]);

/**
 * Workflow attachment types used by the agent builder integration.
 * The matching KI type id is `WORKFLOW_KI_TYPE` in `@kbn/agent-builder-elastic-ai-index-ki-types`.
 */
export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';
export const WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE = 'workflow.yaml.diff';

/**
 * UI event broadcast on the agent builder events bus when a workflow YAML
 * attachment is created or modified by an agent tool.
 */
export const WORKFLOW_YAML_CHANGED_EVENT = 'workflow:yaml_changed';

/**
 * Sentinel `focusStepId` for {@link WorkflowGraphCanvas}: centre on the first
 * trigger node. Matches `HIGHLIGHTED_STEP_TRIGGER` in workflows_management.
 */
export const WORKFLOW_GRAPH_FOCUS_TRIGGER = '__trigger';
