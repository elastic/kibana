/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize } from '@elastic/eui';
import chroma from 'chroma-js';
import { monaco } from '@kbn/code-editor';
import type { KbnCodeEditorChromeOverrides } from '@kbn/code-editor';

/** Shared Monaco layout defaults for workflow YAML surfaces (editor + read-only previews). */
export const WORKFLOW_MONACO_LAYOUT_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
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
    domReadOnly: true,
    contextmenu: false,
    glyphMargin: false, // read-only surfaces have no glyph decorations
    lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    hover: { enabled: 'off' },
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
  hover: { enabled: highlightValidationErrors ? 'on' : 'off' },
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
    lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    hover: { enabled: 'off' },
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

/**
 * Per-instance chrome for workflows Monaco editors: widget surfaces, gutter, selection and diff
 * colours, applied as inline CSS custom properties on the editor's own DOM nodes. It never touches
 * the global Monaco theme, so other editors on the page are unaffected.
 *
 * Should be passed to `CodeEditor` via `chromeOverrides`, or to `applyKbnCodeEditorChromeOverrides` for
 * editors created with `monaco.editor.create*` directly.
 *
 * Syntax (token) colors are a different layer: they come from the language's registered theme
 * resolver and cannot be changed here.
 */
export const workflowsEditorChromeOverrides: KbnCodeEditorChromeOverrides = ({ euiTheme }) => ({
  'list.hoverForeground': euiTheme.colors.textPrimary,
  'list.hoverBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
  'editorSuggestWidget.foreground': euiTheme.colors.textParagraph,
  'editorSuggestWidget.background': euiTheme.colors.backgroundBasePlain,
  'editorSuggestWidget.selectedForeground': euiTheme.colors.textPrimary,
  'editorSuggestWidget.selectedBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
  'editorSuggestWidget.focusHighlightForeground': euiTheme.colors.primary,
  'editorSuggestWidget.border': euiTheme.colors.borderBaseSubdued,
  // Code action (quick fix) widget: same surface and row colors as the suggest widget
  'list.focusForeground': euiTheme.colors.textPrimary,
  'list.focusBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
  'list.activeSelectionForeground': euiTheme.colors.textPrimary,
  'list.activeSelectionBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
  'editorWidget.foreground': euiTheme.colors.textParagraph,
  'editorWidget.background': euiTheme.colors.backgroundBasePlain,
  'editorWidget.border': euiTheme.colors.borderBaseSubdued,
  'editorHoverWidget.foreground': euiTheme.colors.textParagraph,
  'editorHoverWidget.background': euiTheme.colors.backgroundBasePlain,
  'editorHoverWidget.border': euiTheme.colors.borderBaseSubdued,
  // Subtle highlight for hover - 0.15 alpha means 15% opacity
  'editor.hoverHighlightBackground': chroma(transparentize(euiTheme.colors.primary, 0.15)).hex(),
  'editorLineNumber.foreground': euiTheme.colors.textSubdued,
  'editorLineNumber.activeForeground': euiTheme.colors.textSubdued,
  'editorIndentGuide.background1': euiTheme.colors.backgroundLightText,
  'editorIndentGuide.activeBackground1': euiTheme.colors.borderBaseDisabled,
  // Transparent backgrounds, they are set by the styles of the editor container behind.
  'editor.background': 'transparent',
  'editor.selectionBackground': chroma(transparentize(euiTheme.colors.primary, 0.1)).hex(),
  'editor.wordHighlightTextBackground': chroma(transparentize(euiTheme.colors.primary, 0.1)).hex(),
  'editor.wordHighlightBackground': chroma(transparentize(euiTheme.colors.primary, 0.1)).hex(),
  'editor.wordHighlightStrongBackground': chroma(
    transparentize(euiTheme.colors.primary, 0.1)
  ).hex(),
  'editorGutter.background': 'transparent',
  'editorGutter.foldingControlForeground': euiTheme.colors.textSubdued,
  'diffEditor.unchangedRegionBackground': 'transparent',
  'diffEditor.unchangedRegionForeground': euiTheme.colors.textSubdued,
});
