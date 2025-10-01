/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';
import { WorkflowGraph } from '@kbn/workflows/graph';
import YAML, { LineCounter } from 'yaml';
import type { StepInfo, WorkflowLookup } from './build_workflow_lookup';
import { buildWorkflowLookup } from './build_workflow_lookup';
import { getWorkflowZodSchemaLoose } from '../../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../../common/lib/yaml_utils';

// State interface - only serializable data
export interface WorkflowEditorState {
  yamlString?: string;
  yamlDocument?: YAML.Document; // This will be handled specially for serialization
  workflowLookup?: WorkflowLookup;
  workflowGraph?: WorkflowGraph; // This will be handled specially for serialization
  focusedStepInfo?: StepInfo;
}

// Initial state
const initialState: WorkflowEditorState = {
  yamlString: undefined,
  yamlDocument: undefined,
  workflowLookup: undefined,
  workflowGraph: undefined,
  focusedStepInfo: undefined,
};

// Slice
const workflowEditorSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setYamlString: (state, action: { payload: string }) => {
      state.yamlString = action.payload;
    },
    setComputedData: (
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
        state.focusedStepInfo = undefined;
        return;
      }

      state.focusedStepInfo = findStepByLine(action.payload.lineNumber, state.workflowLookup);
    },
  },
});

// Export action creators from the slice
export const { setYamlString, setComputedData, clearComputedData, setCursorPosition } =
  workflowEditorSlice.actions;

function findStepByLine(
  lineNumber: number,
  workflowMetadata: WorkflowLookup
): StepInfo | undefined {
  if (!workflowMetadata) return undefined;
  return (
    Object.values(workflowMetadata.steps!).find((stepIfo) => {
      if (stepIfo.lineStart <= lineNumber && lineNumber <= stepIfo.lineEnd) {
        return stepIfo;
      }
    }) || undefined
  );
}

// Side effects middleware - computes derived data when yamlString changes
export const workflowComputationMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // Only react to yamlString changes
  if (action.type === setYamlString.type) {
    const state = store.getState() as { workflow: WorkflowEditorState };
    const { yamlString } = state.workflow;

    // Clear computed data if no yamlString
    if (!yamlString) {
      store.dispatch(clearComputedData());
      return result;
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
      const graph = parsedWorkflow
        ? WorkflowGraph.fromWorkflowDefinition(parsedWorkflow)
        : undefined;

      // Dispatch computed data
      store.dispatch(
        setComputedData({
          yamlDocument: yamlDoc,
          workflowLookup: lookup,
          workflowGraph: graph,
        })
      );
    } catch (e) {
      // Clear computed data on error
      store.dispatch(clearComputedData());
    }
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
          // Ignore these non-serializable fields in actions
          ignoredActionsPaths: [
            'payload.yamlDocument',
            'payload.workflowGraph',
            'payload.workflowLookup',
            'meta.arg.yamlDocument',
            'meta.arg.workflowGraph',
            'meta.arg.workflowLookup',
          ],
        },
      }).concat(workflowComputationMiddleware),
  });
};

// Default store
export const workflowEditorStore = createWorkflowEditorStore();

// Types for usage
export type WorkflowEditorStore = ReturnType<typeof createWorkflowEditorStore>;
export type RootState = ReturnType<WorkflowEditorStore['getState']>;
export type AppDispatch = WorkflowEditorStore['dispatch'];

// Selectors
export const selectYamlString = (state: RootState) => state.workflow.yamlString;
export const selectYamlDocument = (state: RootState) => state.workflow.yamlDocument;
export const selectWorkflowLookup = (state: RootState) => state.workflow.workflowLookup;
export const selectWorkflowGraph = (state: RootState) => state.workflow.workflowGraph;
export const selectFocusedStepInfo = (state: RootState) => state.workflow.focusedStepInfo;

/*
 * USAGE HINTS:
 *
 * 1. Basic Setup in Component:
 * ```tsx
 * import { Provider, useSelector, useDispatch } from 'react-redux';
 * import { workflowEditorStore, setYamlString, selectYamlString, selectWorkflowGraph } from './__state';
 *
 * function MyApp() {
 *   return (
 *     <Provider store={workflowEditorStore}>
 *       <WorkflowEditor />
 *     </Provider>
 *   );
 * }
 * ```
 *
 * 2. Using in Components:
 * ```tsx
 * function WorkflowEditor() {
 *   const dispatch = useDispatch();
 *   const yamlString = useSelector(selectYamlString);
 *   const workflowGraph = useSelector(selectWorkflowGraph);
 *   const yamlDocument = useSelector(selectYamlDocument);
 *   const workflowLookup = useSelector(selectWorkflowLookup);
 *
 *   const handleYamlChange = (newYaml: string) => {
 *     dispatch(setYamlString(newYaml));
 *     // yamlDocument, workflowLookup, and workflowGraph will be computed automatically
 *   };
 *
 *   const handleCursorChange = (lineNumber: number) => {
 *     dispatch(setCursorPosition({ lineNumber }));
 *     // focusedStepInfo will be updated automatically
 *   };
 *
 *   return (
 *     <div>
 *       <textarea
 *         value={yamlString || ''}
 *         onChange={(e) => handleYamlChange(e.target.value)}
 *       />
 *       {workflowGraph && <div>Graph nodes: {workflowGraph.nodes.length}</div>}
 *     </div>
 *   );
 * }
 * ```
 *
 * 3. With Monaco Editor Integration:
 * ```tsx
 * import { createWorkflowEditorStore } from './__state';
 *
 * function EditorWithMonaco() {
 *   const store = useMemo(() => createWorkflowEditorStore(), []);
 *
 *   return (
 *     <Provider store={store}>
 *       <MonacoEditor
 *         onMount={(editor) => {
 *           // Set up editor change listener
 *           editor.getModel()?.onDidChangeContent(() => {
 *             store.dispatch(setYamlString(editor.getValue()));
 *           });
 *         }}
 *       />
 *     </Provider>
 *   );
 * }
 * ```
 *
 * 4. For Web Worker Support:
 * ```tsx
 * // Store works perfectly in web workers since it no longer depends on Monaco
 * const webWorkerStore = createWorkflowEditorStore();
 *
 * // In web worker:
 * webWorkerStore.dispatch(setYamlString(yamlFromMainThread));
 * // Computed data will be available in store state
 * const state = webWorkerStore.getState();
 * console.log(state.workflow.workflowGraph);
 * ```
 *
 * 5. Custom Hooks (Optional):
 * ```tsx
 * export const useWorkflowEditor = () => {
 *   const dispatch = useDispatch();
 *   const yamlString = useSelector(selectYamlString);
 *   const yamlDocument = useSelector(selectYamlDocument);
 *   const workflowLookup = useSelector(selectWorkflowLookup);
 *   const workflowGraph = useSelector(selectWorkflowGraph);
 *
 *   const updateYaml = useCallback((yaml: string) => {
 *     dispatch(setYamlString(yaml));
 *   }, [dispatch]);
 *
 *   return {
 *     yamlString,
 *     yamlDocument,
 *     workflowLookup,
 *     workflowGraph,
 *     updateYaml
 *   };
 * };
 * ```
 */
