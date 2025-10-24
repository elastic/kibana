/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';
import type { EsWorkflow, WorkflowDetailDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import type { ComputedData, WorkflowDetailState } from './types';
import { findStepByLine } from './utils/step_finder';

// Initial state
const initialState: WorkflowDetailState = {
  yamlString: '',
  workflow: undefined,
  computed: undefined,
  focusedStepId: undefined,
  stepExecutions: undefined,
  highlightedStepId: undefined,
  isTestModalOpen: false,
};

// Slice
const workflowDetailSlice = createSlice({
  name: 'detail',
  initialState,
  reducers: {
    setWorkflow: (state, action: { payload: WorkflowDetailDto }) => {
      state.workflow = action.payload;
      state.yamlString = action.payload.yaml;
    },
    updateWorkflow: (state, action: { payload: Partial<EsWorkflow> }) => {
      if (state.workflow) {
        Object.assign(state.workflow, action.payload);
      }
    },
    setYamlString: (state, action: { payload: string }) => {
      state.yamlString = action.payload;
    },
    // Internal action - not for external use
    _setComputedDataInternal: (state, action: { payload: ComputedData }) => {
      state.computed = { ...action.payload }; // make sure it's a new object
    },
    clearComputedData: (state) => {
      state.computed = undefined;
    },
    setCursorPosition: (state, action: { payload: { lineNumber: number } }) => {
      if (!state.computed?.workflowLookup) {
        state.focusedStepId = undefined;
        return;
      }
      state.focusedStepId = findStepByLine(
        action.payload.lineNumber,
        state.computed.workflowLookup
      );
    },
    setStepExecutions: (
      state,
      action: { payload: { stepExecutions?: WorkflowStepExecutionDto[] } }
    ) => {
      state.stepExecutions = action.payload.stepExecutions;
    },
    setHighlightedStepId: (state, action: { payload: { stepId: string } }) => {
      state.highlightedStepId = action.payload.stepId;
    },
    setIsTestModalOpen: (state, action: { payload: { isTestModalOpen: boolean } }) => {
      state.isTestModalOpen = action.payload.isTestModalOpen;
    },
  },
});

// Export public action creators from the slice
export const {
  setWorkflow,
  updateWorkflow,
  setYamlString,
  clearComputedData,
  setCursorPosition,
  setStepExecutions,
  setHighlightedStepId,
  setIsTestModalOpen,
} = workflowDetailSlice.actions;

// Internal action for middleware use only
export const { _setComputedDataInternal } = workflowDetailSlice.actions;

// Export the reducer
export const workflowDetailReducer = workflowDetailSlice.reducer;

// Ignore these non-serializable fields in the state
export const ignoredPaths: Array<string | RegExp> = [
  /detail\.computed\.*/, // All computed data
  'detail.workflow.definition', // WorkflowYaml schema is not serializable
];
// Ignore these specific action types that contain non-serializable data
export const ignoredActions: Array<string> = ['detail/_setComputedDataInternal'];
