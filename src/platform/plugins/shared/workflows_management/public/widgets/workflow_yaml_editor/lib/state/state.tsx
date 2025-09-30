/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { WorkflowGraph } from '@kbn/workflows/graph';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import YAML from 'yaml';
import type { StepInfo, WorkflowLookup } from './build_workflow_lookup';
import { buildWorkflowLookup } from './build_workflow_lookup';
import { getWorkflowZodSchemaLoose } from '../../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../../common/lib/yaml_utils';

export interface EditorState {
  yamlString?: string;
  yamlDocument?: YAML.Document;
  workflowLookup?: WorkflowLookup;
  workflowGraph?: WorkflowGraph;
  focusedStepInfo?: StepInfo;
  hoveredStepInfo?: StepInfo;
  editor?: monaco.editor.IStandaloneCodeEditor;
  initEditor: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

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
const EditorStateContext = createContext<EditorState | null>(null);

export function useEditorState() {
  const ctx = useContext(EditorStateContext);
  if (!ctx) throw new Error('useEditorState must be used within <EditorStateProvider>');
  return ctx;
}

export function EditorStateProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const [yamlStringBeforeDebounce, setYamlStringBeforeDebounce] = useState<string | undefined>(
    undefined
  );
  const [yamlString, setYamlString] = useState<string | undefined>(undefined);
  const [yamlDocument, setYamlDocument] = useState<YAML.Document | undefined>(undefined);
  const [workflowLookup, setWorkflowLookup] = useState<WorkflowLookup | undefined>(undefined);
  const [workflowGraph, setWorkflowGraph] = useState<WorkflowGraph | undefined>(undefined);
  const [focusedStepInfo, setFocusedStepInfo] = useState<StepInfo | undefined>(undefined);
  const [hoveredStepInfo, setHoveredStepInfo] = useState<StepInfo | undefined>(undefined);

  function initEditor(editor: monaco.editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
    setIsInitialized(true);
  }

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const model = editorRef.current!.getModel()!;

    const disposable = model.onDidChangeContent(() => {
      setYamlStringBeforeDebounce(model.getValue());
    });

    // To instantly init other dependencies
    setYamlString(model.getValue());
    setYamlStringBeforeDebounce(model.getValue());
    return () => {
      disposable.dispose();
    };
  }, [isInitialized, setYamlString]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setYamlString(yamlStringBeforeDebounce), 500);
    return () => clearTimeout(timeoutId);
  }, [yamlStringBeforeDebounce]);

  useEffect(() => {
    if (!yamlString) {
      setYamlDocument(undefined);
      setWorkflowLookup(undefined);
      setWorkflowGraph(undefined);
      return;
    }

    try {
      const yamlDoc = YAML.parseDocument(yamlString);
      const parsingResult = parseWorkflowYamlToJSON(yamlString, getWorkflowZodSchemaLoose());
      const lookup = buildWorkflowLookup(yamlDoc, editorRef.current?.getModel()!);
      const parsedWorkflow = parsingResult.success ? parsingResult.data : null;
      const graph = parsedWorkflow
        ? WorkflowGraph.fromWorkflowDefinition(parsedWorkflow)
        : undefined;

      setYamlDocument(yamlDoc);
      setWorkflowLookup(lookup);
      setWorkflowGraph(graph);
    } catch (e) {
      setYamlDocument(undefined);
      setWorkflowLookup(undefined);
      setWorkflowGraph(undefined);
    }
  }, [yamlString]);

  useEffect(() => {
    if (!workflowLookup) {
      return;
    }

    const disposable = editorRef.current!.onDidChangeCursorPosition((event) => {
      const foundStepInfo = findStepByLine(event.position.lineNumber, workflowLookup);
      setFocusedStepInfo(foundStepInfo);
    });

    return () => disposable.dispose();
  }, [isInitialized, workflowLookup, setFocusedStepInfo]);

  useEffect(() => {
    if (!isInitialized || !workflowLookup) {
      return;
    }

    const disposable = editorRef.current!.onMouseMove((e) => {
      const { position, type } = e.target;
      // Most useful targets (text, empty content area, line numbers, glyph margin)
      const usefulTargets = new Set([
        monaco.editor.MouseTargetType.CONTENT_TEXT,
        monaco.editor.MouseTargetType.CONTENT_EMPTY,
        monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS,
        monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN,
        monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS,
      ]);

      if (position && usefulTargets.has(type)) {
        const foundStepInfo = findStepByLine(position.lineNumber, workflowLookup);
        setHoveredStepInfo(foundStepInfo);
      } else {
        setHoveredStepInfo(undefined);
      }
    });

    return () => disposable.dispose();
  }, [isInitialized, workflowLookup, setHoveredStepInfo]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const disposable = editorRef.current!.onMouseLeave(() => setHoveredStepInfo(undefined));

    return () => disposable.dispose();
  }, [isInitialized, setHoveredStepInfo]);

  return (
    <EditorStateContext.Provider
      value={
        isInitialized
          ? {
              yamlString,
              yamlDocument,
              workflowLookup,
              workflowGraph,
              focusedStepInfo,
              hoveredStepInfo,
              initEditor,
              editor: editorRef.current!,
            }
          : ({ initEditor } as EditorState)
      }
    >
      {children}
    </EditorStateContext.Provider>
  );
}
