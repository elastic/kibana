/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './types';

// Selectors

// Base selectors - these are simple property accessors that don't need memoization
export const selectWorkflowEditorState = (state: RootState) => state.workflow;
const selectComputedState = (state: RootState) => state.workflow.computed;

// Exported memoized selectors for final properties
export const selectYamlString = createSelector(
  selectWorkflowEditorState,
  (workflow) => workflow.yamlString
);

export const selectYamlDocument = createSelector(
  selectComputedState,
  (computed) => computed?.yamlDocument
);

export const selectYamlLineCounter = createSelector(
  selectComputedState,
  (computed) => computed?.yamlLineCounter
);

export const selectWorkflowLookup = createSelector(
  selectComputedState,
  (computed) => computed?.workflowLookup
);

export const selectWorkflowGraph = createSelector(
  selectComputedState,
  (computed) => computed?.workflowGraph
);

export const selectWorkflowDefinition = createSelector(
  selectComputedState,
  (computed) => computed?.workflowDefinition
);

// Only checks if the current workflow yaml can be parses, does check the schema, only the yaml syntax
export const selectIsYamlSyntaxValid = createSelector(selectComputedState, (computed): boolean =>
  Boolean(computed?.workflowDefinition)
);

export const selectFocusedStepId = createSelector(
  selectWorkflowEditorState,
  (workflow) => workflow.focusedStepId
);

export const selectHighlightedStepId = createSelector(
  selectWorkflowEditorState,
  (workflow) => workflow.highlightedStepId
);

export const selectStepExecutions = createSelector(
  selectWorkflowEditorState,
  (workflow) => workflow.stepExecutions
);

export const selectFocusedStepInfo = createSelector(
  selectFocusedStepId,
  selectWorkflowLookup,
  (focusedStepId, workflowLookup) =>
    focusedStepId && workflowLookup ? workflowLookup.steps[focusedStepId] : undefined
);

export const selectConnectorsData = createSelector(
  selectWorkflowEditorState,
  (workflow) => workflow.connectors
);

export const selectSchemaLoose = createSelector(
  selectWorkflowEditorState,
  (workflow) => workflow.schemaLoose
);
