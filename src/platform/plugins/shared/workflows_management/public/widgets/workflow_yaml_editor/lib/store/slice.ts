/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';
import type YAML from 'yaml';
import type { LineCounter } from 'yaml';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowEditorState } from './types';
import type { WorkflowLookup } from './utils/build_workflow_lookup';
import { findStepByLine } from './utils/step_finder';

// Initial state
const initialState: WorkflowEditorState = {
  yamlString: undefined,
  computed: undefined,
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
        payload: {
          yamlDocument?: YAML.Document;
          yamlLineCounter?: LineCounter;
          workflowLookup?: WorkflowLookup;
          workflowGraph?: WorkflowGraph;
          workflowDefinition?: WorkflowYaml;
        };
      }
    ) => {
      state.computed = {
        yamlLineCounter: action.payload.yamlLineCounter,
        yamlDocument: action.payload.yamlDocument,
        workflowLookup: action.payload.workflowLookup,
        workflowGraph: action.payload.workflowGraph,
        workflowDefinition: action.payload.workflowDefinition,
      };
    },
    clearComputedData: (state) => {
      state.computed = {
        yamlLineCounter: undefined,
        yamlDocument: undefined,
        workflowLookup: undefined,
        workflowGraph: undefined,
        workflowDefinition: undefined,
      };
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
} = workflowEditorSlice.actions;

// Internal action for middleware use only
export const { _setComputedDataInternal } = workflowEditorSlice.actions;

// Export the reducer
export const workflowEditorReducer = workflowEditorSlice.reducer;
