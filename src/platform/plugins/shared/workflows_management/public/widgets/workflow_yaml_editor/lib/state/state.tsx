/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import React, { createContext, useContext, useEffect, useState } from 'react';
import YAML from 'yaml';
import { indexYamlDocument, type WorkflowMetadata } from './index_yaml_document';

export interface EditorState {
  yamlString: string | null;
  yamlDocument: YAML.Document | null;
  workflowMetadata: WorkflowMetadata | null;
  editor: monaco.editor.IStandaloneCodeEditor | null;
}

const EditorStateContext = createContext<EditorState | null>(null);

export function useEditorState() {
  const ctx = useContext(EditorStateContext);
  if (!ctx) throw new Error('useEditorState must be used within <EditorStateProvider>');
  return ctx;
}

export function EditorStateProvider({
  editor,
  children,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  children: React.ReactNode;
}) {
  const [yamlString, setYamlString] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    yamlString: null,
    yamlDocument: null,
    workflowMetadata: null,
    editor: null,
  });

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
        workflowMetadata: null,
        editor: null,
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      try {
        const doc = YAML.parseDocument(yamlString);
        setEditorState({
          yamlString,
          yamlDocument: doc,
          workflowMetadata: indexYamlDocument(doc, editor?.getModel()!),
          editor,
        });
      } catch (e) {
        setEditorState({
          yamlString: null,
          yamlDocument: null,
          workflowMetadata: null,
          editor: null,
        });
      }
    }, 500); // debounce parsing to avoid excessive work on each keystroke
    return () => clearTimeout(timeoutId);
  }, [editor, yamlString]);

  return <EditorStateContext.Provider value={editorState}>{children}</EditorStateContext.Provider>;
}
