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
export const selectYamlString = (state: RootState) => state.workflow.yamlString;

export const selectYamlDocument = (state: RootState) =>
  state.workflow.computed ? state.workflow.computed.yamlDocument : undefined;

export const selectWorkflowLookup = (state: RootState) =>
  state.workflow.computed ? state.workflow.computed.workflowLookup : undefined;

export const selectWorkflowGraph = (state: RootState) =>
  state.workflow.computed ? state.workflow.computed.workflowGraph : undefined;

export const selectFocusedStepId = (state: RootState) => state.workflow.focusedStepId;

export const selectFocusedStepInfo = createSelector(
  selectFocusedStepId,
  selectWorkflowLookup,
  (focusedStepId, workflowLookup) =>
    focusedStepId && workflowLookup ? workflowLookup.steps[focusedStepId] : undefined
);
