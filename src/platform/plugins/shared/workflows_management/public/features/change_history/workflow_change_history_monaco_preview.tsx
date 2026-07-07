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
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeHistoryDiffTelemetry } from '@kbn/change-history-ui';
import { monaco } from '@kbn/code-editor';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useDefineWorkflowsMonacoTheme } from '@kbn/workflows-ui';
import type { WorkflowChangeHistoryCompareIndicator } from './get_workflow_change_history_compare_indicator';
import { useWorkflowChangeHistoryPreviewValidation } from './use_workflow_change_history_preview_validation';
import {
  WorkflowChangeHistoryCompareIndicatorBar,
  WorkflowChangeHistoryCompareSplitPaneLabels,
} from './workflow_change_history_compare_indicator';
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
import { buildWorkflowChangeHistoryUnifiedDiffLayoutStyles } from './workflow_change_history_unified_diff_layout';
import {
  getWorkflowValidationDisplayOptions,
  WORKFLOW_CHANGE_HISTORY_DIFF_GLOBAL_EDITOR_OPTIONS,
  WORKFLOW_CHANGE_HISTORY_DIFF_MONACO_BASE_OPTIONS,
  WORKFLOW_CHANGE_HISTORY_PREVIEW_MONACO_OPTIONS,
  WORKFLOW_CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS,
  WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_EDITOR_OPTIONS,
  WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS,
} from '../../widgets/workflow_yaml_editor/lib/workflow_monaco_layout_options';
import { clearWorkflowYamlComputationCache } from '../validate_workflow_yaml/lib/workflow_yaml_computation_cache';

const FLOATING_NAVIGATOR_BOTTOM = `calc(${WORKFLOW_CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT} - ${WORKFLOW_CHANGE_HISTORY_PREVIEW_NAVIGATOR_HEIGHT} / 2)`;

const getDiffEditorOptions = (
  compareMode: WorkflowChangeHistoryCompareMode,
  highlightValidationErrors: boolean
): monaco.editor.IStandaloneDiffEditorConstructionOptions => ({
  ...WORKFLOW_CHANGE_HISTORY_DIFF_MONACO_BASE_OPTIONS,
  ...(compareMode === 'split'
    ? WORKFLOW_CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS
    : WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS),
  ...getWorkflowValidationDisplayOptions(highlightValidationErrors),
  renderSideBySide: compareMode === 'split',
  renderIndicators: compareMode === 'split',
});

const configureDiffEditors = (
  diffEditor: monaco.editor.IStandaloneDiffEditor,
  compareMode: WorkflowChangeHistoryCompareMode,
  highlightValidationErrors: boolean
): void => {
  const sharedChildOptions: monaco.editor.IEditorOptions & monaco.editor.IGlobalEditorOptions = {
    ...WORKFLOW_CHANGE_HISTORY_DIFF_GLOBAL_EDITOR_OPTIONS,
    glyphMargin: false,
    folding: false,
    ...getWorkflowValidationDisplayOptions(highlightValidationErrors),
  };

  if (compareMode === 'split') {
    const splitOptions: monaco.editor.IEditorOptions = {
      ...sharedChildOptions,
      ...WORKFLOW_CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS,
    };
    diffEditor.getOriginalEditor().updateOptions(splitOptions);
    diffEditor.getModifiedEditor().updateOptions(splitOptions);
    return;
  }

  diffEditor.getOriginalEditor().updateOptions({
    ...sharedChildOptions,
    ...WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_EDITOR_OPTIONS,
  });
  diffEditor.getModifiedEditor().updateOptions({
    ...sharedChildOptions,
    ...WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS,
  });
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

export interface WorkflowChangeHistoryMonacoPreviewProps {
  /** Monaco original model in diff mode (typically the older snapshot). */
  baselineYaml?: string;
  /** Monaco modified model in diff mode, or the sole editor when not diffing. */
  targetYaml: string;
  /** YAML validated in the preview; defaults to `targetYaml`. */
  validationYaml?: string;
  diffTelemetry?: ChangeHistoryDiffTelemetry;
  compareIndicator?: WorkflowChangeHistoryCompareIndicator;
}

export const WorkflowChangeHistoryMonacoPreview = ({
  baselineYaml,
  targetYaml,
  validationYaml = targetYaml,
  diffTelemetry,
  compareIndicator,
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
  const [highlightValidationErrors, setHighlightValidationErrors] = useState(false);
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const highlightValidationErrorsRef = useRef(highlightValidationErrors);
  highlightValidationErrorsRef.current = highlightValidationErrors;

  const isCompareMode = baselineYaml !== undefined;
  const useDiffEditor = isCompareMode;

  const getActiveEditor = useCallback(
    () => editorRef.current ?? diffEditorRef.current?.getModifiedEditor() ?? null,
    []
  );

  const configureDiffEditorsRef = useRef(configureDiffEditors);
  configureDiffEditorsRef.current = configureDiffEditors;

  const stableConfigureDiffEditors = useCallback(
    (
      diffEditor: monaco.editor.IStandaloneDiffEditor,
      mode: WorkflowChangeHistoryCompareMode,
      highlight: boolean
    ) => configureDiffEditorsRef.current(diffEditor, mode, highlight),
    []
  );

  const { validationResults, isValidationLoading, handleValidationErrorClick } =
    useWorkflowChangeHistoryPreviewValidation({
      getActiveEditor,
      validationDecorationsRef,
      validationYaml,
      highlightValidationErrors,
      isEditorMounted,
      editorRef,
      diffEditorRef,
      compareModeRef,
      configureDiffEditors: stableConfigureDiffEditors,
    });

  const handleCompareModeChange = useCallback(
    (mode: WorkflowChangeHistoryCompareMode) => {
      setCompareMode(mode);
      diffTelemetry?.setCompareMode(mode);
    },
    [diffTelemetry]
  );

  useDefineWorkflowsMonacoTheme();

  useEffect(() => {
    if (!diffTelemetry || !useDiffEditor || baselineYaml == null) {
      return;
    }

    if (baselineYaml !== targetYaml) {
      diffTelemetry.reportDiffViewed();
    }
  }, [baselineYaml, diffTelemetry, targetYaml, useDiffEditor]);

  useEffect(() => () => clearWorkflowYamlComputationCache(), []);

  const updateDiffState = useCallback((editor: monaco.editor.IStandaloneDiffEditor) => {
    const changes = editor.getLineChanges() ?? [];
    setDiffTotalChanges(changes.length);
    setDiffCurrentIndex((currentIndex) =>
      changes.length === 0 ? 0 : Math.min(currentIndex, changes.length - 1)
    );
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (useDiffEditor && baselineYaml != null) {
      const mountCompareMode = compareModeRef.current;
      const originalModel = monaco.editor.createModel(baselineYaml, 'yaml');
      const modifiedModel = monaco.editor.createModel(targetYaml, 'yaml');
      const diffEditor = monaco.editor.createDiffEditor(
        container,
        getDiffEditorOptions(mountCompareMode, false)
      );

      diffEditor.setModel({ original: originalModel, modified: modifiedModel });
      configureDiffEditors(diffEditor, mountCompareMode, false);
      diffEditor.layout();
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

    const model = monaco.editor.createModel(targetYaml, 'yaml');
    const editor = monaco.editor.create(container, {
      ...WORKFLOW_CHANGE_HISTORY_PREVIEW_MONACO_OPTIONS,
      ...getWorkflowValidationDisplayOptions(false),
      model,
    });
    editor.layout();

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
  }, [baselineYaml, targetYaml, updateDiffState, useDiffEditor]);

  useEffect(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor || !useDiffEditor) {
      return;
    }

    // Compare layout only — highlight squiggles/hover are owned by
    // useWorkflowChangeHistoryPreviewValidation (do not add highlightValidationErrors here).
    diffEditor.updateOptions({
      renderSideBySide: compareMode === 'split',
      renderIndicators: compareMode === 'split',
    });
    configureDiffEditors(diffEditor, compareMode, highlightValidationErrorsRef.current);
    diffEditor.layout();
  }, [compareMode, useDiffEditor]);

  const handleDiffPrevious = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) {
      return;
    }

    const changes = diffEditor.getLineChanges() ?? [];
    if (changes.length === 0) {
      return;
    }

    diffTelemetry?.reportDiffChangeNavigated('line_hunk');

    setDiffCurrentIndex((currentIndex) => {
      const nextIndex = Math.max(currentIndex - 1, 0);
      pendingDiffScrollIndexRef.current = null;
      scrollDiffEditorToChange(diffEditor, nextIndex);
      return nextIndex;
    });
  }, [diffTelemetry]);

  const handleDiffNext = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) {
      return;
    }

    const changes = diffEditor.getLineChanges() ?? [];
    if (changes.length === 0) {
      return;
    }

    diffTelemetry?.reportDiffChangeNavigated('line_hunk');

    setDiffCurrentIndex((currentIndex) => {
      const nextIndex = Math.min(currentIndex + 1, Math.max(changes.length - 1, 0));
      pendingDiffScrollIndexRef.current = null;
      scrollDiffEditorToChange(diffEditor, nextIndex);
      return nextIndex;
    });
  }, [diffTelemetry]);

  const showDiffNavigator = isCompareMode;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={styles.container}
      data-test-subj="workflowChangeHistoryMonacoPreview"
    >
      <EuiFlexItem css={styles.editor} grow={true}>
        {isCompareMode && compareIndicator ? (
          compareMode === 'split' ? (
            <WorkflowChangeHistoryCompareSplitPaneLabels indicator={compareIndicator} />
          ) : (
            <WorkflowChangeHistoryCompareIndicatorBar indicator={compareIndicator} />
          )
        ) : null}
        <EuiText
          component="div"
          css={[
            styles.monacoHost,
            isCompareMode && compareMode === 'split' ? styles.monacoHostSplit : undefined,
            isCompareMode && compareMode === 'unified' ? styles.monacoHostUnified : undefined,
          ]}
        >
          <div ref={containerRef} data-test-subj="workflowChangeHistoryMonacoEditor" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem css={styles.footer} grow={false}>
        <WorkflowChangeHistoryPreviewFooter
          validationResults={validationResults}
          isEditorMounted={isEditorMounted}
          isValidationLoading={isValidationLoading}
          highlightValidationErrors={highlightValidationErrors}
          onValidationErrorClick={handleValidationErrorClick}
        />
        <div css={styles.footerSettingsAnchor}>
          <WorkflowChangeHistoryPreviewSettingsPopover
            hasCompare={isCompareMode}
            compareMode={compareMode}
            onCompareModeChange={handleCompareModeChange}
            highlightValidationErrors={highlightValidationErrors}
            onHighlightValidationErrorsChange={setHighlightValidationErrors}
            isOpen={isSettingsPopoverOpen}
            onIsOpenChange={setIsSettingsPopoverOpen}
          />
        </div>
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
      '.template-variable-warning': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        borderRadius: '2px',
      },
      '.liquid-template-error': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        color: euiTheme.colors.severity.danger,
        borderRadius: '2px',
      },
      '.liquid-template-warning': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        borderRadius: '2px',
      },
      '.duplicate-step-name-error': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
      },
      '.yaml-error': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        borderRadius: '2px',
      },
      '.yaml-warning': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        borderRadius: '2px',
      },
    }),
  editor: (themeContext: UseEuiTheme) =>
    css({
      flex: '1 1 0',
      minHeight: 0,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 0,
      display: 'flex',
      flexDirection: 'column',
      // Monaco scrollbars default to z-index 11; keep them below floating overlays.
      ...buildWorkflowChangeHistoryUnifiedDiffLayoutStyles(themeContext),
      '& .monaco-editor .scrollbar': {
        zIndex: 1,
      },
    }),
  monacoHost: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '1 1 auto',
      minHeight: 0,
      height: '100%',
      padding: `0 ${euiTheme.size.m}`,

      '& > div': {
        height: '100%',
      },
    }),
  monacoHostSplit: css({
    padding: 0,
  }),
  monacoHostUnified: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingLeft: `calc(${euiTheme.size.m} + ${euiTheme.size.s})`,
    }),
  footer: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      zIndex: 1,
    }),
  footerSettingsAnchor: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      right: euiTheme.size.m,
      top: 0,
      height: WORKFLOW_CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      zIndex: 2,
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
