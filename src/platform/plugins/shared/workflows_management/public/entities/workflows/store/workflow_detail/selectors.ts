/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSelector } from '@reduxjs/toolkit';
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

// Only checks if the current workflow yaml can be parses, does check the schema, only the yaml syntax
export const selectIsYamlSyntaxValid = createSelector(selectYamlComputed, (computed): boolean =>
  Boolean(computed?.workflowDefinition)
);

export const selectFocusedStepId = createSelector(selectDetail, (detail) => detail.focusedStepId);

export const selectHighlightedStepId = createSelector(
  selectDetail,
  (detail) => detail.highlightedStepId
);

export const selectIsTestModalOpen = createSelector(
  selectDetail,
  (detail) => detail.isTestModalOpen
);

export const selectIsSavingYaml = createSelector(
  selectDetail,
  (detail) => detail.loading.isSavingYaml
);

export const selectConnectors = createSelector(selectDetail, (detail) => detail.connectors);
export const selectSchema = createSelector(selectDetail, (detail) => detail.schema);

export const selectActiveTab = createSelector(selectDetail, (detail) => detail.activeTab);
export const selectExecution = createSelector(selectDetail, (detail) => detail.execution);
export const selectStepExecutions = createSelector(
  selectExecution,
  (execution) => execution?.stepExecutions
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

const selectIsEditorExecutionYaml = createSelector(
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
