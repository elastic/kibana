/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import type { WorkflowEditorState } from './types';
import { findStepByLine } from './utils/step_finder';
import { getWorkflowZodSchemaLoose } from '../../../../../common/schema';

// Initial state
const initialState: WorkflowEditorState = {
  isInitialized: false,
  yamlString: undefined,
  computed: undefined,
  connectors: undefined,
  schemaLoose: getWorkflowZodSchemaLoose({}),
  focusedStepId: undefined,
  stepExecutions: undefined,
  highlightedStepId: undefined,
};

// Slice
const workflowEditorSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setYamlString: (state, action: { payload: string }) => {
      state.yamlString = action.payload;
    },
    // Internal action - not for external use
    _setComputedDataInternal: (
      state,
      action: {
        payload: WorkflowEditorState['computed'];
      }
    ) => {
      state.isInitialized = true;
      state.computed = action.payload;
    },
    _setGeneratedSchemaInternal: (
      state,
      action: { payload: WorkflowEditorState['schemaLoose'] }
    ) => {
      state.schemaLoose = action.payload;
    },
    setConnectors: (state, action: { payload: WorkflowEditorState['connectors'] }) => {
      state.connectors = action.payload;
    },
    // Clear computed data (used when YAML changes)
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
  },
});

// Export public action creators from the slice
export const {
  setYamlString,
  clearComputedData,
  setCursorPosition,
  setStepExecutions,
  setHighlightedStepId,
  setConnectors,
} = workflowEditorSlice.actions;

// Internal action for middleware use only
export const { _setComputedDataInternal, _setGeneratedSchemaInternal } =
  workflowEditorSlice.actions;

// Export the reducer
export const workflowEditorReducer = workflowEditorSlice.reducer;
