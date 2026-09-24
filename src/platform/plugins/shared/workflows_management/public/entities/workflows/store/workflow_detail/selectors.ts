/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSelector } from 'redux-toolkit-v1';
import {
  buildStepDurations,
  EMPTY_STEP_DURATIONS,
} from '../../../../shared/lib/build_step_durations';
import type { RootState } from '../types';

// Selectors

// Base selectors - these are simple property accessors that don't need memoization
export const selectDetail = (state: RootState) => state.detail;
export const selectYamlComputed = (state: RootState) => state.detail.computed;

// Exported memoized selectors for final properties
export const selectWorkflow = createSelector(selectDetail, (detail) => detail.workflow);
export const selectYamlString = createSelector(selectDetail, (detail) => detail.yamlString);

export const selectWorkflowId = createSelector(selectWorkflow, (workflow) => workflow?.id);
export const selectIsEnabled = createSelector(selectWorkflow, (workflow) => !!workflow?.enabled);
export const selectWorkflowName = createSelector(selectWorkflow, (workflow) => workflow?.name);
export const selectWorkflowTags = createSelector(
  selectWorkflow,
  (workflow) => workflow?.tags ?? []
);

export const selectHasChanges = createSelector(
  selectDetail,
  (detail) => detail.yamlString !== detail.workflow?.yaml
);

export const selectIsYamlSynced = createSelector(selectDetail, (detail) => detail.isYamlSynced);

export const selectYamlDocument = createSelector(
  selectYamlComputed,
  (computed) => computed?.yamlDocument
);

export const selectYamlLineCounter = createSelector(
  selectYamlComputed,
  (computed) => computed?.yamlLineCounter
);

export const selectWorkflowGraph = createSelector(
  selectYamlComputed,
  (computed) => computed?.workflowGraph
);

export const selectWorkflowDefinition = createSelector(
  selectYamlComputed,
  (computed) => computed?.workflowDefinition
);

export const selectGraphBuildError = createSelector(
  selectYamlComputed,
  (computed) => computed?.graphBuildError
);

// Only checks if the current workflow yaml can be parsed, does not check the schema, only the yaml syntax
export const selectIsYamlSyntaxValid = createSelector(selectYamlDocument, (yamlDoc): boolean =>
  Boolean(yamlDoc && yamlDoc.errors.length === 0)
);

// Checks whether validation errors (from strict schema + custom validations) are present
export const selectHasYamlSchemaValidationErrors = createSelector(
  selectDetail,
  (detail): boolean => detail.hasYamlSchemaValidationErrors
);

export const selectAiAssisted = createSelector(
  selectDetail,
  (detail): boolean => detail.aiAssisted
);

export const selectFocusedStepId = createSelector(selectDetail, (detail) => detail.focusedStepId);

export const selectFocusedTriggerId = createSelector(
  selectDetail,
  (detail) => detail.focusedTriggerId
);

export const selectHighlightedStepId = createSelector(
  selectDetail,
  (detail) => detail.highlightedStepId
);

export const selectIsTestModalOpen = createSelector(
  selectDetail,
  (detail) => detail.isTestModalOpen
);

export const selectReplayExecutionId = createSelector(
  selectDetail,
  (detail) => detail.replay?.executionId ?? null
);

export const selectReplayStepExecutionId = createSelector(
  selectDetail,
  (detail) => detail.replay?.stepExecutionId ?? null
);

export const selectTestStepModalOpenStepId = createSelector(
  selectDetail,
  (detail) => detail.testStepModalOpenStepId ?? undefined
);

export const selectIsSavingYaml = createSelector(
  selectDetail,
  (detail) => detail.loading.isSavingYaml
);

export const selectConnectors = createSelector(selectDetail, (detail) => detail.connectors);
export const selectConnectorsLoadState = createSelector(
  selectDetail,
  (detail) => detail.connectorsLoadState
);
export const selectWorkflows = createSelector(selectDetail, (detail) => detail.workflows);
export const selectSchema = createSelector(selectDetail, (detail) => detail.schema);

export const selectActiveTab = createSelector(selectDetail, (detail) => detail.activeTab);
export const selectExecution = createSelector(selectDetail, (detail) => detail.execution);
export const selectStepExecutionsTotal = createSelector(
  selectDetail,
  (detail) => detail.stepExecutionsTotal
);
export const selectStepExecutions = createSelector(
  selectExecution,
  (execution) => execution?.stepExecutions
);

/**
 * Step execution docs used exclusively for duration chip computation.
 * For terminal executions with more than `WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE` docs,
 * `loadExecutionThunk` fetches a larger page (up to `WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE`)
 * and stores it here so chips cover steps beyond the step-tree's 1000-doc window.
 * Falls back to `execution.stepExecutions` when the big fetch hasn't run or wasn't needed.
 */
export const selectDurationStepExecutions = createSelector(
  selectDetail,
  selectExecution,
  (detail, execution) => detail.durationStepExecutions ?? execution?.stepExecutions
);

export const selectIsExecutionsTab = createSelector(
  selectActiveTab,
  (activeTab): activeTab is 'executions' => activeTab === 'executions'
);
export const selectIsWorkflowTab = createSelector(
  selectActiveTab,
  (activeTab): activeTab is 'workflow' => activeTab === 'workflow'
);

/**
 * Editor selectors
 * These selectors are used to get the correct data for the editor based on the active tab (current workflow or previous execution).
 */

export const selectIsEditorExecutionYaml = createSelector(
  selectIsExecutionsTab,
  selectExecution,
  (isExecutionsTab, execution) => Boolean(isExecutionsTab && execution?.yaml)
);

export const selectEditorYaml = createSelector(
  selectIsEditorExecutionYaml,
  selectExecution,
  selectYamlString,
  (isExecutionYamlForEditor, execution, yamlString) => {
    if (isExecutionYamlForEditor) {
      return execution?.yaml ?? ''; // Will always be defined if isExecutionYaml is true
    }
    return yamlString;
  }
);
export const selectEditorComputed = createSelector(
  selectIsEditorExecutionYaml,
  selectDetail,
  (isExecutionYamlForEditor, detailState) => {
    if (isExecutionYamlForEditor) {
      return detailState.computedExecution;
    }
    return detailState.computed;
  }
);

export const selectEditorYamlDocument = createSelector(
  selectEditorComputed,
  (computed) => computed?.yamlDocument
);

export const selectEditorWorkflowLookup = createSelector(
  selectEditorComputed,
  (computed) => computed?.workflowLookup
);

export const selectEditorFocusedStepInfo = createSelector(
  selectFocusedStepId,
  selectEditorWorkflowLookup,
  (focusedStepId, workflowLookup) =>
    focusedStepId && workflowLookup ? workflowLookup.steps[focusedStepId] : undefined
);

export const selectEditorFocusedTriggerInfo = createSelector(
  selectFocusedTriggerId,
  selectEditorWorkflowLookup,
  (focusedTriggerId, workflowLookup) => {
    if (!focusedTriggerId || !workflowLookup) return undefined;
    const { triggersLineStart, triggersLineEnd } = workflowLookup;
    if (triggersLineStart == null || triggersLineEnd == null) return undefined;
    return { lineStart: triggersLineStart, lineEnd: triggersLineEnd };
  }
);

export const selectEditorWorkflowGraph = createSelector(
  selectEditorComputed,
  (computed) => computed?.workflowGraph
);

export const selectEditorWorkflowDefinition = createSelector(
  selectEditorComputed,
  (computed) => computed?.workflowDefinition
);

export const selectEditorYamlLineCounter = createSelector(
  selectEditorComputed,
  (computed) => computed?.yamlLineCounter
);

/**
 * True when the YAML currently shown in the editor is the exact snapshot the loaded execution ran.
 * Used by duration-chip decorations to verify that line numbers from the execution's computed
 * lookup align with the editor content.
 *
 * Covers both tabs:
 * - Executions tab: `selectEditorYaml` returns `execution.yaml` by construction → always true.
 * - Workflow tab after a test run: true while the draft still matches what ran; false the moment the
 *   user makes an edit — at which point chips would be mispositioned anyway.
 */
export const selectIsEditorYamlExecutionSnapshot = createSelector(
  selectEditorYaml,
  selectExecution,
  (editorYaml, execution) => execution?.yaml != null && editorYaml === execution.yaml
);

/**
 * Per-step duration map, populated whenever an execution is loaded in the store.
 * Covers both the old sidebar (workflow tab + execution open) and the executions tab.
 * Uses the same allow-list as the flyout tree so numbers always agree.
 */
export const selectStepDurations = createSelector(
  selectDurationStepExecutions,
  selectEditorWorkflowLookup,
  (stepExecutions, lookup) =>
    stepExecutions?.length && lookup
      ? buildStepDurations(stepExecutions, lookup.steps)
      : EMPTY_STEP_DURATIONS
);

/**
 * Denominator for the hotspot colour ratio: the execution's total duration in ms.
 * Returns 0 while the run is still in flight (duration is null), which suppresses all colour.
 */
export const selectStepDurationDenominator = createSelector(selectExecution, (execution) =>
  typeof execution?.duration === 'number' && execution.duration > 0 ? execution.duration : 0
);

export const selectConnectorFlyout = createSelector(
  selectDetail,
  (detail) => detail.connectorFlyout
);
export const selectIsConnectorFlyoutOpen = createSelector(
  selectConnectorFlyout,
  (flyout) => flyout.isOpen
);
export const selectConnectorFlyoutType = createSelector(
  selectConnectorFlyout,
  (flyout) => flyout.connectorType
);
export const selectConnectorFlyoutConnectorToEdit = createSelector(
  selectConnectorFlyout,
  (flyout) => flyout.connectorIdToEdit
);
export const selectConnectorFlyoutInsertPosition = createSelector(
  selectConnectorFlyout,
  (flyout) => flyout.insertPosition
);
