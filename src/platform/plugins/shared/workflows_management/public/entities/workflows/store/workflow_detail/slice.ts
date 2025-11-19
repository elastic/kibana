/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';
import type { EsWorkflow, WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';
import type { ActiveTab, ComputedData, WorkflowDetailState } from './types';
import { findStepByLine } from './utils/step_finder';
import { getWorkflowZodSchema } from '../../../../../common/schema';
import { saveYamlThunk } from './thunks/save_yaml_thunk';

// Initial state
const initialState: WorkflowDetailState = {
  yamlString: '',
  computed: undefined,
  workflow: undefined,
  execution: undefined,
  computedExecution: undefined,
  activeTab: undefined,
  connectors: undefined,
  schema: getWorkflowZodSchema({}),
  focusedStepId: undefined,
  highlightedStepId: undefined,
  isTestModalOpen: false,
  loading: {
    isSavingYaml: false,
  },
};

// Slice
const workflowDetailSlice = createSlice({
  name: 'detail',
  initialState,
  reducers: {
    setWorkflow: (state, action: { payload: WorkflowDetailDto }) => {
      state.workflow = action.payload;
    },
    updateWorkflow: (state, action: { payload: Partial<EsWorkflow> }) => {
      if (state.workflow) {
        Object.assign(state.workflow, action.payload);
      }
    },
    setYamlString: (state, action: { payload: string }) => {
      state.yamlString = action.payload;
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
    setHighlightedStepId: (state, action: { payload: { stepId: string } }) => {
      state.highlightedStepId = action.payload.stepId;
    },
    setIsTestModalOpen: (state, action: { payload: boolean }) => {
      state.isTestModalOpen = action.payload;
    },
    setConnectors: (state, action: { payload: WorkflowDetailState['connectors'] }) => {
      state.connectors = action.payload;
    },
    setExecution: (state, action: { payload: WorkflowExecutionDto | undefined }) => {
      state.execution = action.payload;
    },
    clearExecution: (state) => {
      state.execution = undefined;
      state.computedExecution = undefined;
    },
    setActiveTab: (state, action: { payload: ActiveTab | undefined }) => {
      state.activeTab = action.payload;
    },

    // Internal actions - these are not for components usage
    _setComputedDataInternal: (state, action: { payload: ComputedData }) => {
      state.computed = action.payload;
    },
    _clearComputedData: (state) => {
      state.computed = {};
    },
    _setGeneratedSchemaInternal: (state, action: { payload: WorkflowDetailState['schema'] }) => {
      state.schema = action.payload;
    },
    _setComputedExecution: (state, action: { payload: ComputedData }) => {
      state.computedExecution = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveYamlThunk.pending, (state) => {
        state.loading.isSavingYaml = true;
      })
      .addCase(saveYamlThunk.fulfilled, (state) => {
        state.loading.isSavingYaml = false;
      })
      .addCase(saveYamlThunk.rejected, (state) => {
        state.loading.isSavingYaml = false;
      });
  },
});

// Export the reducer
export const workflowDetailReducer = workflowDetailSlice.reducer;

export const {
  // Public action creators
  setWorkflow,
  updateWorkflow,
  setYamlString,
  setCursorPosition,
  setHighlightedStepId,
  setIsTestModalOpen,
  setConnectors,
  setExecution,
  clearExecution,
  setActiveTab,

  // Internal action creators for middleware use only
  _setComputedDataInternal,
  _clearComputedData,
  _setGeneratedSchemaInternal,
  _setComputedExecution,
} = workflowDetailSlice.actions;

// Ignore these non-serializable fields in the state
export const ignoredPaths: Array<string | RegExp> = [
  /detail\.computed\.*/, // All computed data is not serializable
  /detail\.computedExecution\.*/, // All computed execution data is not serializable
  'detail.schema', // Zod schema is not serializable
  'detail.workflow.definition', // WorkflowYaml definition schema is not serializable
  'detail.execution.definition', // WorkflowYaml definition schema is not serializable
];
// Ignore these specific action types that contain non-serializable data
export const ignoredActions: Array<string> = [
  'detail/_setComputedDataInternal',
  'detail/_setGeneratedSchemaInternal',
  'detail/_setComputedExecution',
];
