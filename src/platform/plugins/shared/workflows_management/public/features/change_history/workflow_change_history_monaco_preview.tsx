/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiText, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { monaco } from '@kbn/code-editor';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useWorkflowsMonacoTheme } from '@kbn/workflows-ui';
import { applyWorkflowYamlValidationToEditor } from './apply_workflow_yaml_validation_to_editor';
import {
  WORKFLOW_CHANGE_HISTORY_PREVIEW_NAVIGATOR_HEIGHT,
  WorkflowChangeHistoryDiffNavigator,
} from './workflow_change_history_diff_navigator';
import {
  WORKFLOW_CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
  WorkflowChangeHistoryPreviewFooter,
} from './workflow_change_history_preview_footer';
import type { WorkflowChangeHistoryCompareMode } from './workflow_change_history_preview_settings_popover';
import { WorkflowChangeHistoryPreviewSettingsPopover } from './workflow_change_history_preview_settings_popover';
import { navigateToErrorPosition } from '../../widgets/workflow_yaml_editor/lib/utils';
import { WORKFLOW_READ_ONLY_MONACO_OPTIONS } from '../../widgets/workflow_yaml_editor/lib/workflow_monaco_layout_options';
import { clearWorkflowYamlComputationCache } from '../validate_workflow_yaml/lib/workflow_yaml_computation_cache';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

const VALIDATION_DEBOUNCE_MS = 150;

const FLOATING_NAVIGATOR_BOTTOM = `calc(${WORKFLOW_CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT} - ${WORKFLOW_CHANGE_HISTORY_PREVIEW_NAVIGATOR_HEIGHT} / 2)`;

const getDiffEditorOptions = (
  compareMode: WorkflowChangeHistoryCompareMode
): monaco.editor.IDiffEditorConstructionOptions => ({
  ...WORKFLOW_READ_ONLY_MONACO_OPTIONS,
  renderSideBySide: compareMode === 'split',
  renderOverviewRuler: false,
  overviewRulerLanes: 0,
  renderIndicators: false,
  glyphMargin: false,
  renderMarginRevertIcon: false,
  hideUnchangedRegions: {
    enabled: false,
  },
});

const INLINE_DIFF_CHILD_EDITOR_OPTIONS: monaco.editor.IEditorOptions = {
  glyphMargin: false,
  folding: WORKFLOW_READ_ONLY_MONACO_OPTIONS.folding,
  lineNumbers: 'on',
};

const getChangeStartLine = (change: monaco.editor.ILineChange): number => {
  if (change.modifiedStartLineNumber > 0) {
    return change.modifiedStartLineNumber;
  }

  return change.originalStartLineNumber;
};

const getChangeEndLine = (change: monaco.editor.ILineChange): number => {
  if (change.modifiedEndLineNumber > 0) {
    return change.modifiedEndLineNumber;
  }

  return change.originalEndLineNumber;
};

const scrollDiffEditorToChange = (
  diffEditor: monaco.editor.IStandaloneDiffEditor,
  changeIndex: number
): boolean => {
  const changes = diffEditor.getLineChanges() ?? [];
  if (changes.length === 0) {
    return false;
  }

  const boundedIndex = Math.max(0, Math.min(changeIndex, changes.length - 1));
  const change = changes[boundedIndex];
  const startLine = getChangeStartLine(change);
  if (startLine <= 0) {
    return false;
  }

  const endLine = Math.max(startLine, getChangeEndLine(change));

  diffEditor.setPosition({ lineNumber: startLine, column: 1 });
  if (endLine > startLine) {
    diffEditor.revealLinesInCenter(startLine, endLine);
  } else {
    diffEditor.revealLineInCenter(startLine);
  }

  return true;
};

const configureDiffEditors = (
  diffEditor: monaco.editor.IStandaloneDiffEditor,
  compareMode: WorkflowChangeHistoryCompareMode
): void => {
  if (compareMode === 'split') {
    diffEditor.getOriginalEditor().updateOptions(INLINE_DIFF_CHILD_EDITOR_OPTIONS);
    diffEditor.getModifiedEditor().updateOptions(INLINE_DIFF_CHILD_EDITOR_OPTIONS);
    return;
  }

  diffEditor.getOriginalEditor().updateOptions({
    ...INLINE_DIFF_CHILD_EDITOR_OPTIONS,
    lineNumbers: 'off',
  });
  diffEditor.getModifiedEditor().updateOptions(INLINE_DIFF_CHILD_EDITOR_OPTIONS);
};

export interface WorkflowChangeHistoryMonacoPreviewProps {
  yaml: string;
  compareYaml?: string;
}

export const WorkflowChangeHistoryMonacoPreview = ({
  yaml,
  compareYaml,
}: WorkflowChangeHistoryMonacoPreviewProps): JSX.Element => {
  const styles = useMemoCss(componentStyles);
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const validationDecorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const pendingDiffScrollIndexRef = useRef<number | null>(null);
  const [diffCurrentIndex, setDiffCurrentIndex] = useState(0);
  const [diffTotalChanges, setDiffTotalChanges] = useState(0);
  const [compareMode, setCompareMode] = useState<WorkflowChangeHistoryCompareMode>('unified');
  const compareModeRef = useRef(compareMode);
  compareModeRef.current = compareMode;
  const [highlightValidationErrors, setHighlightValidationErrors] = useState(true);
  const [validationResults, setValidationResults] = useState<YamlValidationResult[]>([]);
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const hasCompare = Boolean(compareYaml && compareYaml !== yaml);

  useWorkflowsMonacoTheme();

  useEffect(() => () => clearWorkflowYamlComputationCache(), []);

  const getActiveEditor = useCallback(
    () => editorRef.current ?? diffEditorRef.current?.getModifiedEditor() ?? null,
    []
  );

  const updateDiffState = useCallback((editor: monaco.editor.IStandaloneDiffEditor) => {
    const changes = editor.getLineChanges() ?? [];
    setDiffTotalChanges(changes.length);
    setDiffCurrentIndex((currentIndex) =>
      changes.length === 0 ? 0 : Math.min(currentIndex, changes.length - 1)
    );
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (hasCompare && compareYaml != null) {
      const mountCompareMode = compareModeRef.current;
      const originalModel = monaco.editor.createModel(compareYaml, 'yaml');
      const modifiedModel = monaco.editor.createModel(yaml, 'yaml');
      const diffEditor = monaco.editor.createDiffEditor(
        container,
        getDiffEditorOptions(mountCompareMode)
      );

      diffEditor.setModel({ original: originalModel, modified: modifiedModel });
      configureDiffEditors(diffEditor, mountCompareMode);
      diffEditorRef.current = diffEditor;
      editorRef.current = null;
      setIsEditorMounted(true);
      pendingDiffScrollIndexRef.current = 0;
      setDiffCurrentIndex(0);

      updateDiffState(diffEditor);
      const diffDisposable = diffEditor.onDidUpdateDiff(() => {
        updateDiffState(diffEditor);

        const pendingIndex = pendingDiffScrollIndexRef.current;
        if (pendingIndex !== null && scrollDiffEditorToChange(diffEditor, pendingIndex)) {
          pendingDiffScrollIndexRef.current = null;
        }
      });

      return () => {
        diffDisposable.dispose();
        diffEditor.dispose();
        originalModel.dispose();
        modifiedModel.dispose();
        diffEditorRef.current = null;
        validationDecorationsRef.current?.clear();
        validationDecorationsRef.current = null;
        setIsEditorMounted(false);
      };
    }

    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = monaco.editor.create(container, {
      ...WORKFLOW_READ_ONLY_MONACO_OPTIONS,
      model,
    });

    editorRef.current = editor;
    diffEditorRef.current = null;
    setIsEditorMounted(true);
    setDiffTotalChanges(0);
    setDiffCurrentIndex(0);

    return () => {
      editor.dispose();
      model.dispose();
      editorRef.current = null;
      validationDecorationsRef.current?.clear();
      validationDecorationsRef.current = null;
      setIsEditorMounted(false);
    };
  }, [compareYaml, hasCompare, updateDiffState, yaml]);

  useEffect(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor || !hasCompare) {
      return;
    }

    diffEditor.updateOptions({ renderSideBySide: compareMode === 'split' });
    configureDiffEditors(diffEditor, compareMode);
  }, [compareMode, hasCompare]);

  useEffect(() => {
    if (!isEditorMounted) {
      return;
    }

    const abortController = new AbortController();
    let validationRafId: number | undefined;

    const timeoutId = window.setTimeout(() => {
      validationRafId = requestAnimationFrame(() => {
        void (async () => {
          const editor = getActiveEditor();
          if (!editor || abortController.signal.aborted) {
            return;
          }

          try {
            const { validationResults: nextValidationResults } =
              await applyWorkflowYamlValidationToEditor(
                editor,
                yaml,
                highlightValidationErrors,
                validationDecorationsRef,
                abortController.signal
              );

            if (!abortController.signal.aborted) {
              setValidationResults(nextValidationResults);
            }
          } catch (validationError) {
            if (abortController.signal.aborted) {
              return;
            }

            if (validationError instanceof DOMException && validationError.name === 'AbortError') {
              return;
            }

            setValidationResults([]);
          }
        })();
      });
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      if (validationRafId !== undefined) {
        cancelAnimationFrame(validationRafId);
      }
      abortController.abort();
    };
  }, [getActiveEditor, highlightValidationErrors, isEditorMounted, yaml]);

  const handleValidationErrorClick = useCallback(
    (error: YamlValidationResult) => {
      const editor = getActiveEditor();
      if (!editor || error.startLineNumber <= 0) {
        return;
      }

      navigateToErrorPosition(editor, error.startLineNumber, error.startColumn);
    },
    [getActiveEditor]
  );

  const handleDiffPrevious = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) {
      return;
    }

    setDiffCurrentIndex((currentIndex) => {
      const nextIndex = Math.max(currentIndex - 1, 0);
      pendingDiffScrollIndexRef.current = null;
      scrollDiffEditorToChange(diffEditor, nextIndex);
      return nextIndex;
    });
  }, []);

  const handleDiffNext = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) {
      return;
    }

    setDiffCurrentIndex((currentIndex) => {
      const changes = diffEditor.getLineChanges() ?? [];
      const nextIndex = Math.min(currentIndex + 1, Math.max(changes.length - 1, 0));
      pendingDiffScrollIndexRef.current = null;
      scrollDiffEditorToChange(diffEditor, nextIndex);
      return nextIndex;
    });
  }, []);

  const showDiffNavigator = hasCompare && diffTotalChanges > 0;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={styles.container}
      data-test-subj="workflowChangeHistoryMonacoPreview"
    >
      <EuiFlexItem css={styles.editor} grow={true}>
        <EuiText component="div" css={styles.monacoHost}>
          <div ref={containerRef} data-test-subj="workflowChangeHistoryMonacoEditor" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem css={styles.footer} grow={false}>
        <WorkflowChangeHistoryPreviewFooter
          validationResults={validationResults}
          isEditorMounted={isEditorMounted}
          onValidationErrorClick={handleValidationErrorClick}
          settingsSlot={
            <WorkflowChangeHistoryPreviewSettingsPopover
              hasCompare={hasCompare}
              compareMode={compareMode}
              onCompareModeChange={setCompareMode}
              highlightValidationErrors={highlightValidationErrors}
              onHighlightValidationErrorsChange={setHighlightValidationErrors}
            />
          }
        />
      </EuiFlexItem>
      {showDiffNavigator ? (
        <EuiFlexItem css={styles.floatingToolbar} grow={false}>
          <WorkflowChangeHistoryDiffNavigator
            currentIndex={diffCurrentIndex}
            totalChanges={diffTotalChanges}
            onPrevious={handleDiffPrevious}
            onNext={handleDiffNext}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,

      '.template-variable-error': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        color: euiTheme.colors.severity.danger,
        borderRadius: '2px',
      },
      '.liquid-template-error': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        color: euiTheme.colors.severity.danger,
        borderRadius: '2px',
      },
    }),
  editor: css({
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 0,
    // Monaco scrollbars default to z-index 11; keep them below floating overlays.
    '& .monaco-editor .scrollbar': {
      zIndex: 1,
    },
  }),
  monacoHost: css({
    height: '100%',

    '& > div': {
      height: '100%',
    },
  }),
  footer: css({
    position: 'relative',
    zIndex: 1,
  }),
  floatingToolbar: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      left: '50%',
      // Overlap the editor/footer seam; must sit above the footer accordion.
      bottom: FLOATING_NAVIGATOR_BOTTOM,
      transform: 'translateX(-50%)',
      zIndex: euiTheme.levels.modal,
      flex: '0 0 auto',
      width: 'auto',
      height: 'auto',
      pointerEvents: 'none',

      '& > *': {
        pointerEvents: 'auto',
      },
    }),
};
