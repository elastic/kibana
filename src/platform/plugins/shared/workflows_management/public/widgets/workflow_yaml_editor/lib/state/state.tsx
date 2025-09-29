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
import React, { createContext, useContext, useEffect, useState } from 'react';
import YAML from 'yaml';
import type { StepInfo, WorkflowLookup } from './index_yaml_document';
import { buildWorkflowLookup } from './index_yaml_document';
import { getWorkflowZodSchemaLoose } from '../../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../../common/lib/yaml_utils';

export interface EditorState {
  yamlString: string | null;
  yamlDocument: YAML.Document | null;
  workflowLookup: WorkflowLookup | null;
  workflowGraph: WorkflowGraph | null;
  focusedStepInfo: StepInfo | null;
  hoveredStepInfo?: StepInfo | null;
  editor: monaco.editor.IStandaloneCodeEditor | null;
}

function findStepByLine(
  lineNumber: number,
  workflowMetadata: WorkflowLookup | null
): StepInfo | null {
  if (!workflowMetadata) return null;
  return (
    Object.values(workflowMetadata.steps!).find((stepIfo) => {
      if (stepIfo.lineStart <= lineNumber && lineNumber <= stepIfo.lineEnd) {
        return stepIfo;
      }
    }) || null
  );
}
const EditorStateContext = createContext<EditorState | null>(null);

export function useEditorState() {
  const ctx = useContext(EditorStateContext);
  if (!ctx) throw new Error('useEditorState must be used within <EditorStateProvider>');
  return ctx;
}

export function EditorStateProvider({
  editor,
  onEditorStateChange,
  children,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  onEditorStateChange?: (state: EditorState) => void;
  children: React.ReactNode;
}) {
  const [yamlString, setYamlString] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    yamlString: null,
    yamlDocument: null,
    workflowLookup: null,
    workflowGraph: null,
    editor: null,
    focusedStepInfo: null,
  });
  const cursorPosition = editor?.getPosition();
  const { workflowLookup: workflowMetadata } = editorState;

  useEffect(() => {
    if (!editor) return;
    const model = editor.getModel()!;

    const disposable = model.onDidChangeContent(() => {
      setYamlString(model.getValue());
    });

    setYamlString(model.getValue());
    return () => {
      disposable.dispose();
    };
  }, [editor, setYamlString]);

  useEffect(() => {
    if (yamlString === null) {
      setEditorState({
        yamlString: null,
        yamlDocument: null,
        workflowLookup: null,
        workflowGraph: null,
        focusedStepInfo: null,
        editor: null,
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      try {
        const yamlDocument = YAML.parseDocument(yamlString);
        const parsingResult = parseWorkflowYamlToJSON(yamlString, getWorkflowZodSchemaLoose());
        const workflowLookup = buildWorkflowLookup(yamlDocument, editor?.getModel()!);
        const parsedWorkflow = parsingResult.success ? parsingResult.data : null;
        const workflowGraph = parsedWorkflow
          ? WorkflowGraph.fromWorkflowDefinition(parsedWorkflow)
          : null;

        setEditorState({
          yamlString,
          yamlDocument,
          workflowLookup,
          workflowGraph,
          editor,
          focusedStepInfo: null,
        });
      } catch (e) {
        setEditorState({
          yamlString: null,
          yamlDocument: null,
          workflowLookup: null,
          workflowGraph: null,
          focusedStepInfo: null,
          editor: null,
        });
      }
    }, 500); // debounce parsing to avoid excessive work on each keystroke
    return () => clearTimeout(timeoutId);
  }, [editor, yamlString]);

  useEffect(() => {
    if (!cursorPosition || !workflowMetadata) {
      return;
    }

    const focusedStepInfo = findStepByLine(cursorPosition.lineNumber, workflowMetadata);
    setEditorState((prev) => ({ ...prev, focusedStepInfo }));
  }, [workflowMetadata, cursorPosition, setEditorState]);

  useEffect(() => {
    if (!editor) return;

    const disposable = editor.onMouseMove((e) => {
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
        setEditorState((prev) => ({
          ...prev,
          hoveredStepInfo: findStepByLine(position.lineNumber, prev.workflowLookup),
        }));
      } else {
        setEditorState((prev) => ({ ...prev, hoveredStepInfo: null }));
      }
    });

    return () => disposable.dispose();
  }, [editor, setEditorState]);

  useEffect(() => {
    if (!editor) return;
    const disposable = editor.onMouseLeave(() => {
      setEditorState((prev) => ({ ...prev, hoveredStepInfo: null }));
    });

    return () => disposable.dispose();
  }, [editor, setEditorState]);

  useEffect(() => {
    onEditorStateChange?.(editorState);
  }, [editorState, onEditorStateChange]);

  return <EditorStateContext.Provider value={editorState}>{children}</EditorStateContext.Provider>;
}
