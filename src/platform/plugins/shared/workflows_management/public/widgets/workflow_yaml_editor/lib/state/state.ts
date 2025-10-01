/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { AnyAction, Dispatch, Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import { WorkflowGraph } from '@kbn/workflows/graph';
import YAML, { LineCounter } from 'yaml';
import type { WorkflowLookup } from './build_workflow_lookup';
import { buildWorkflowLookup } from './build_workflow_lookup';
import { getWorkflowZodSchemaLoose } from '../../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../../common/lib/yaml_utils';

// State interface - only serializable data
export interface WorkflowEditorState {
  yamlString?: string;
  yamlDocument?: YAML.Document; // This will be handled specially for serialization
  workflowLookup?: WorkflowLookup;
  workflowGraph?: WorkflowGraph; // This will be handled specially for serialization
  focusedStepId?: string;
}

// Initial state
const initialState: WorkflowEditorState = {
  yamlString: undefined,
  yamlDocument: undefined,
  workflowLookup: undefined,
  workflowGraph: undefined,
  focusedStepId: undefined,
};

function findStepByLine(lineNumber: number, workflowMetadata: WorkflowLookup): string | undefined {
  if (!workflowMetadata) {
    return;
  }

  return Object.values(workflowMetadata.steps!).find(
    (stepIfo) => stepIfo.lineStart <= lineNumber && lineNumber <= stepIfo.lineEnd
  )?.stepId;
}

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
          workflowLookup?: WorkflowLookup;
          workflowGraph?: WorkflowGraph;
        };
      }
    ) => {
      state.yamlDocument = action.payload.yamlDocument;
      state.workflowLookup = action.payload.workflowLookup;
      state.workflowGraph = action.payload.workflowGraph;
    },
    clearComputedData: (state) => {
      state.yamlDocument = undefined;
      state.workflowLookup = undefined;
      state.workflowGraph = undefined;
    },
    setCursorPosition: (state, action: { payload: { lineNumber: number } }) => {
      if (!state.workflowLookup) {
        state.focusedStepId = undefined;
        return;
      }

      state.focusedStepId = findStepByLine(action.payload.lineNumber, state.workflowLookup);
    },
  },
});

// Export public action creators from the slice
export const { setYamlString, clearComputedData, setCursorPosition } = workflowEditorSlice.actions;

// Internal action for middleware use only
const { _setComputedDataInternal } = workflowEditorSlice.actions;

// Debounced computation function
let computationTimeoutId: NodeJS.Timeout | null = null;
const COMPUTATION_DEBOUNCE_MS = 500; // 500ms debounce

const performComputation = (
  store: MiddlewareAPI<Dispatch<AnyAction>, any>,
  yamlString: string | undefined
) => {
  if (!yamlString) {
    store.dispatch(clearComputedData());
    return;
  }

  // Compute derived data
  try {
    // Parse YAML document
    const lineCounter = new LineCounter();
    const yamlDoc = YAML.parseDocument(yamlString, { lineCounter });

    // Parse workflow JSON for graph creation
    const parsingResult = parseWorkflowYamlToJSON(yamlString, getWorkflowZodSchemaLoose());

    // Build workflow lookup
    const lookup = buildWorkflowLookup(yamlDoc, lineCounter);

    // Create workflow graph
    const parsedWorkflow = parsingResult.success ? parsingResult.data : null;
    const graph = parsedWorkflow ? WorkflowGraph.fromWorkflowDefinition(parsedWorkflow) : undefined;

    // Dispatch computed data
    store.dispatch(
      _setComputedDataInternal({
        yamlDocument: yamlDoc,
        workflowLookup: lookup,
        workflowGraph: graph,
      })
    );
  } catch (e) {
    // Clear computed data on error
    store.dispatch(clearComputedData());
  }
};

const debounceComputation = (
  store: MiddlewareAPI<Dispatch<AnyAction>, any>,
  yamlString: string | undefined
) => {
  // Clear any pending computation
  if (computationTimeoutId) {
    clearTimeout(computationTimeoutId);
    computationTimeoutId = null;
  }

  // Debounce the computation
  computationTimeoutId = setTimeout(() => {
    performComputation(store, yamlString);
    computationTimeoutId = null;
  }, COMPUTATION_DEBOUNCE_MS);
};

// Side effects middleware - computes derived data when yamlString changes (debounced)
export const workflowComputationMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // Only react to yamlString changes
  if (action.type === setYamlString.type) {
    const state = store.getState() as { workflow: WorkflowEditorState };
    const { yamlString } = state.workflow;

    // Do computation immidiatly if yaml string is defined and previous state of
    if (yamlString && !state.workflow.workflowGraph) {
      performComputation(store, yamlString);
      return;
    }

    // Clear any pending computation
    if (computationTimeoutId) {
      clearTimeout(computationTimeoutId);
      computationTimeoutId = null;
    }

    debounceComputation(store, yamlString);
  }

  return result;
};

// Store factory
export const createWorkflowEditorStore = () => {
  return configureStore({
    reducer: {
      workflow: workflowEditorSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these non-serializable fields in the state
          ignoredPaths: [
            'workflow.yamlDocument',
            'workflow.workflowGraph',
            'workflow.workflowLookup',
          ],
          // Ignore these specific action types that contain non-serializable data
          ignoredActions: ['workflow/_setComputedDataInternal'],
        },
      }).concat(workflowComputationMiddleware),
  });
};

// Default store
export const workflowEditorStore = createWorkflowEditorStore();

// Types for usage
type RootState = ReturnType<ReturnType<typeof createWorkflowEditorStore>['getState']>;

// Selectors
export const selectYamlString = (state: RootState) => state.workflow.yamlString;
export const selectYamlDocument = (state: RootState) => state.workflow.yamlDocument;
export const selectWorkflowLookup = (state: RootState) => state.workflow.workflowLookup;
export const selectWorkflowGraph = (state: RootState) => state.workflow.workflowGraph;
export const selectFocusedStepInfo = (state: RootState) =>
  state.workflow.focusedStepId && state.workflow.workflowLookup
    ? state.workflow.workflowLookup.steps[state.workflow.focusedStepId]
    : undefined;
