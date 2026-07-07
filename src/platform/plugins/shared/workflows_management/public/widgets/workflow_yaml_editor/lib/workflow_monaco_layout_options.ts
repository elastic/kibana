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

/**
 * Read-only Monaco for change history preview (single-version view).
 * Disables folding and glyph margin so the gutter width stays stable.
 */
export const WORKFLOW_CHANGE_HISTORY_PREVIEW_MONACO_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    ...WORKFLOW_READ_ONLY_MONACO_OPTIONS,
    glyphMargin: false,
    folding: false,
    showFoldingControls: 'never',
    lineNumbersMinChars: 2,
  };

/** Read-only editors need explicit squiggle + hover options; Monaco defaults hide them when readOnly. */
export const getWorkflowValidationDisplayOptions = (
  highlightValidationErrors: boolean
): monaco.editor.IEditorOptions => ({
  renderValidationDecorations: highlightValidationErrors ? 'on' : 'off',
  hover: { enabled: highlightValidationErrors },
});

/** Global editor options applied to diff child editors via `updateOptions`. */
export const WORKFLOW_CHANGE_HISTORY_DIFF_GLOBAL_EDITOR_OPTIONS: Pick<
  monaco.editor.IGlobalEditorOptions,
  'tabSize' | 'insertSpaces'
> = {
  tabSize: 2,
  insertSpaces: true,
};

/** Shared read-only diff defaults; do not reuse the editable-editor option bundle. */
export const WORKFLOW_CHANGE_HISTORY_DIFF_MONACO_BASE_OPTIONS: monaco.editor.IStandaloneDiffEditorConstructionOptions =
  {
    theme: WORKFLOWS_MONACO_EDITOR_THEME,
    readOnly: true,
    domReadOnly: true,
    contextmenu: false,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    glyphMargin: false,
    folding: false,
    showFoldingControls: 'never',
    lineNumbersMinChars: 2,
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
    lightbulb: { enabled: false },
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    hover: { enabled: false },
    parameterHints: { enabled: false },
    renderOverviewRuler: false,
    overviewRulerLanes: 0,
    renderIndicators: false,
    renderMarginRevertIcon: false,
    hideUnchangedRegions: {
      enabled: false,
    },
  };

/** Inline unified diff: no gutter; original pane is hidden via preview CSS. */
export const WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_EDITOR_OPTIONS: monaco.editor.IEditorOptions = {
  lineNumbers: 'off',
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
};

/** Inline unified diff: modified pane shows line numbers (original is hidden). */
export const WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS: monaco.editor.IEditorOptions =
  {
    lineNumbers: 'on',
    lineNumbersMinChars: 2,
    lineDecorationsWidth: 24,
  };

/** Side-by-side diff: show line numbers in each pane. */
export const WORKFLOW_CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS: monaco.editor.IEditorOptions = {
  lineNumbers: 'on',
  lineNumbersMinChars: 2,
  // Wider than Monaco default (10) so +/- diff indicators are not flush with line numbers.
  lineDecorationsWidth: 24,
};
