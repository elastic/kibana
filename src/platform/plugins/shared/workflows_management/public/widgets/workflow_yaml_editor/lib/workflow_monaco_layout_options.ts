/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/code-editor';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '@kbn/workflows-ui';

/** Shared Monaco layout defaults for workflow YAML surfaces (editor + history preview). */
export const WORKFLOW_MONACO_LAYOUT_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  theme: WORKFLOWS_MONACO_EDITOR_THEME,
  minimap: { enabled: false },
  automaticLayout: true,
  lineNumbers: 'on',
  glyphMargin: true,
  scrollBeyondLastLine: false,
  folding: true,
  showFoldingControls: 'mouseover',
  tabSize: 2,
  lineNumbersMinChars: 2,
  insertSpaces: true,
  fontSize: 14,
  lineHeight: 23,
  renderWhitespace: 'none',
  roundedSelection: false,
  guides: { indentation: true },
  wordWrap: 'on',
  wordWrapColumn: 80,
  wrappingIndent: 'indent',
  padding: {
    top: 24,
    bottom: 16,
  },
};

export const WORKFLOW_READ_ONLY_MONACO_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    ...WORKFLOW_MONACO_LAYOUT_OPTIONS,
    readOnly: true,
    contextmenu: false,
    domReadOnly: true,
    lightbulb: { enabled: false },
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    hover: { enabled: false },
    parameterHints: { enabled: false },
  };
