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
export const selectDetailState = (state: RootState) => state.detail;
export const selectDetailComputedState = (state: RootState) => state.detail.computed;

// Exported memoized selectors for final properties
export const selectWorkflow = createSelector(selectDetailState, (detail) => detail.workflow);
export const selectYamlString = createSelector(selectDetailState, (detail) => detail.yamlString);

export const selectWorkflowId = createSelector(selectWorkflow, (workflow) => workflow?.id);
export const selectIsEnabled = createSelector(selectWorkflow, (workflow) => !!workflow?.enabled);
export const selectWorkflowName = createSelector(selectWorkflow, (workflow) => workflow?.name);

export const selectHasChanges = createSelector(
  selectDetailState,
  (detail) => detail.yamlString !== detail.workflow?.yaml
);

export const selectYamlDocument = createSelector(
  selectDetailComputedState,
  (computed) => computed?.yamlDocument
);

export const selectYamlLineCounter = createSelector(
  selectDetailComputedState,
  (computed) => computed?.yamlLineCounter
);

export const selectWorkflowLookup = createSelector(
  selectDetailComputedState,
  (computed) => computed?.workflowLookup
);

export const selectWorkflowGraph = createSelector(
  selectDetailComputedState,
  (computed) => computed?.workflowGraph
);

export const selectWorkflowDefinition = createSelector(
  selectDetailComputedState,
  (computed) => computed?.workflowDefinition
);

// Only checks if the current workflow yaml can be parses, does check the schema, only the yaml syntax
export const selectIsYamlSyntaxValid = createSelector(
  selectDetailComputedState,
  (computed): boolean => Boolean(computed?.workflowDefinition)
);

export const selectFocusedStepId = createSelector(
  selectDetailState,
  (detail) => detail.focusedStepId
);

export const selectHighlightedStepId = createSelector(
  selectDetailState,
  (detail) => detail.highlightedStepId
);

export const selectStepExecutions = createSelector(
  selectDetailState,
  (detail) => detail.stepExecutions
);

export const selectFocusedStepInfo = createSelector(
  selectFocusedStepId,
  selectWorkflowLookup,
  (focusedStepId, workflowLookup) =>
    focusedStepId && workflowLookup ? workflowLookup.steps[focusedStepId] : undefined
);

export const selectIsTestModalOpen = createSelector(
  selectDetailState,
  (detail) => detail.isTestModalOpen
);

export const selectConnectors = createSelector(selectDetailState, (detail) => detail.connectors);
export const selectSchema = createSelector(selectDetailState, (detail) => detail.schema);
