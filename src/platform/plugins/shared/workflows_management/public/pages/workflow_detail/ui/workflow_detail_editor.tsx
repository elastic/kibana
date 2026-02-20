/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import type { StepContext } from '@kbn/workflows';
import {
  WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
  WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
} from '@kbn/workflows';
import { useContextOverrideData } from './use_context_override_data';
import { WorkflowDetailConnectorFlyout } from './workflow_detail_connector_flyout';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { selectYamlString } from '../../../entities/workflows/store/workflow_detail/selectors';
import { ExecutionGraph } from '../../../features/debug_graph/execution_graph';
import { TestStepModal } from '../../../features/run_workflow/ui/test_step_modal';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { YamlEditor } from '../../../shared/ui';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { GlobalWorkflowEditorStyles } from '../../../widgets/workflow_yaml_editor/styles/global_workflow_editor_styles';
import {
  getSplitViewLineTypes,
  normalizeForDiff,
} from '../../../widgets/workflow_yaml_editor/ui/decorations/build_merged_diff_lines';
import type { DiffLineType } from '../../../widgets/workflow_yaml_editor/ui/decorations/build_merged_diff_lines';

const WorkflowYAMLEditor = React.lazy(() =>
  import('../../../widgets/workflow_yaml_editor').then((module) => ({
    default: module.WorkflowYAMLEditor,
  }))
);

const WorkflowVisualEditor = React.lazy(() =>
  import('../../../features/workflow_visual_editor').then((module) => ({
    default: module.WorkflowVisualEditor,
  }))
);

interface WorkflowDetailEditorProps {
  highlightDiff?: boolean;
  /** When set, line diff compares current YAML to this (e.g. selected version from history). */
  diffOriginalValue?: string;
  /** How to display the diff: unified (inline) or split (side-by-side). */
  diffViewMode?: 'unified' | 'split';
}

const READ_ONLY_EDITOR_OPTIONS = {
  readOnly: true,
  minimap: { enabled: false },
  lineNumbers: 'on' as const,
  glyphMargin: true,
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
};

function applySplitDiffDecorations(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineTypes: DiffLineType[],
  highlightType: 'add' | 'remove'
): monaco.editor.IEditorDecorationsCollection {
  const model = editor.getModel();
  if (!model || model.getLineCount() !== lineTypes.length) {
    return editor.createDecorationsCollection([]);
  }
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  const className = highlightType === 'add' ? 'diff-line-added' : 'diff-line-removed';
  const marginClassName =
    highlightType === 'add' ? 'diff-line-added-margin' : 'diff-line-removed-margin';
  const glyphClassName = highlightType === 'add' ? 'diff-glyph-added' : 'diff-glyph-removed';
  for (let i = 0; i < lineTypes.length; i++) {
    if (lineTypes[i] === highlightType) {
      const lineNumber = i + 1;
      const maxColumn = model.getLineMaxColumn(lineNumber);
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, maxColumn),
        options: {
          isWholeLine: true,
          className,
          marginClassName,
          glyphMarginClassName: glyphClassName,
        },
      });
    }
  }
  return editor.createDecorationsCollection(decorations);
}

function SplitDiffPaneEditor({
  value,
  lineTypes,
  highlightType,
}: {
  value: string;
  lineTypes: DiffLineType[];
  highlightType: 'add' | 'remove';
}) {
  const collectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const disposableRef = useRef<monaco.IDisposable | null>(null);

  const tryApplyDecorations = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || lineTypes.length === 0) return;
    const model = editor.getModel();
    if (!model || model.getLineCount() !== lineTypes.length) return;
    if (collectionRef.current) {
      collectionRef.current.clear();
      collectionRef.current = null;
    }
    collectionRef.current = applySplitDiffDecorations(editor, lineTypes, highlightType);
  }, [lineTypes, highlightType]);

  useEffect(() => {
    tryApplyDecorations();
  }, [tryApplyDecorations, value]);

  const editorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      tryApplyDecorations();
      const model = editor.getModel();
      if (model) {
        disposableRef.current = model.onDidChangeContent(tryApplyDecorations);
      }
      setTimeout(tryApplyDecorations, 0);
      setTimeout(tryApplyDecorations, 100);
    },
    [tryApplyDecorations]
  );

  const editorWillUnmount = useCallback(() => {
    disposableRef.current?.dispose();
    disposableRef.current = null;
    if (collectionRef.current) {
      collectionRef.current.clear();
      collectionRef.current = null;
    }
    editorRef.current = null;
  }, []);

  return (
    <YamlEditor
      value={value}
      onChange={() => {}}
      schemas={null}
      options={READ_ONLY_EDITOR_OPTIONS}
      editorDidMount={editorDidMount}
      editorWillUnmount={editorWillUnmount}
    />
  );
}

export const WorkflowDetailEditor = React.memo<WorkflowDetailEditorProps>(
  ({ highlightDiff, diffOriginalValue, diffViewMode = 'unified' }) => {
    const styles = useMemoCss(componentStyles);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    // Redux selectors, only used in current workflow tab, not in executions tab
    const workflowYaml = useSelector(selectYamlString) ?? '';

    // Hooks
    const { uiSettings, notifications } = useKibana().services;
    const { setSelectedExecution } = useWorkflowUrlState();
    const getContextOverrideData = useContextOverrideData();
    const { runIndividualStep } = useWorkflowActions();

    // Local state
    const [testStepId, setTestStepId] = useState<string | null>(null);
    const [contextOverride, setContextOverride] = useState<ContextOverrideData | null>(null);

    // UI settings
    const isVisualEditorEnabled = uiSettings?.get<boolean>(
      WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
      false
    );
    const isExecutionGraphEnabled = uiSettings?.get<boolean>(
      WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
      false
    );

    // Modal handlers
    const closeModal = useCallback(() => {
      setTestStepId(null);
      setContextOverride(null);
    }, []);

    // Step run handlers
    const submitStepRun = useCallback(
      async (stepId: string, mock: Partial<StepContext>) => {
        try {
          const response = await runIndividualStep.mutateAsync({
            stepId,
            workflowYaml,
            contextOverride: mock,
          });
          setSelectedExecution(response.workflowExecutionId);
          closeModal();
        } catch (error) {
          const errorMessage =
            error.body?.message ||
            error.message ||
            'An unexpected error occurred while running the step';
          notifications.toasts.addError(new Error(errorMessage), {
            title: i18n.translate('workflows.detail.submitStepRun.error', {
              defaultMessage: 'Failed to run step',
            }),
          });
        }
      },
      [runIndividualStep, workflowYaml, setSelectedExecution, closeModal, notifications.toasts]
    );

    const handleStepRun = useCallback(
      async (params: { stepId: string; actionType: string }) => {
        if (params.actionType !== 'run') {
          return;
        }

        const contextOverrideData = getContextOverrideData(params.stepId);
        if (!contextOverrideData) {
          return;
        }

        // If step doesn't reference any other data/steps, submit immediately
        if (!Object.keys(contextOverrideData.stepContext).length) {
          await submitStepRun(params.stepId, {});
          return;
        }

        // Otherwise, show modal for user input
        setContextOverride(contextOverrideData);
        setTestStepId(params.stepId);
      },
      [getContextOverrideData, submitStepRun]
    );

    const isSplitDiffView =
      highlightDiff &&
      diffOriginalValue != null &&
      diffOriginalValue !== '' &&
      diffViewMode === 'split';

    const splitLineTypes = isSplitDiffView
      ? getSplitViewLineTypes(diffOriginalValue, workflowYaml)
      : null;

    return (
      <>
        {isSplitDiffView && <GlobalWorkflowEditorStyles />}
        <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
          <EuiFlexItem css={styles.yamlEditor}>
            {isSplitDiffView && splitLineTypes ? (
              <EuiFlexGroup gutterSize="none" css={styles.splitDiffContainer} alignItems="stretch">
                <EuiFlexItem grow={1} css={styles.splitDiffPane}>
                  <div
                    css={[styles.splitDiffPaneLabel, styles.splitDiffPaneLabelCurrent]}
                    data-test-subj="workflowDiffSplitCurrentLabel"
                  >
                    <EuiText size="xs" css={styles.splitDiffPaneLabelText}>
                      {i18n.translate('workflows.diffView.split.currentVersionLabel', {
                        defaultMessage: 'Current version',
                      })}
                    </EuiText>
                  </div>
                  <div css={styles.splitDiffEditor}>
                    <SplitDiffPaneEditor
                      value={normalizeForDiff(workflowYaml)}
                      lineTypes={splitLineTypes.current}
                      highlightType="add"
                    />
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={1} css={styles.splitDiffPane}>
                  <div
                    css={[styles.splitDiffPaneLabel, styles.splitDiffPaneLabelPrevious]}
                    data-test-subj="workflowDiffSplitPreviousLabel"
                  >
                    <EuiText size="xs" css={styles.splitDiffPaneLabelText}>
                      {i18n.translate('workflows.diffView.split.previousVersionLabel', {
                        defaultMessage: 'Previous version',
                      })}
                    </EuiText>
                  </div>
                  <div css={styles.splitDiffEditor}>
                    <SplitDiffPaneEditor
                      value={normalizeForDiff(diffOriginalValue)}
                      lineTypes={splitLineTypes.original}
                      highlightType="remove"
                    />
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <React.Suspense fallback={<EuiLoadingSpinner />}>
                <WorkflowYAMLEditor
                  highlightDiff={highlightDiff}
                  diffOriginalValue={diffOriginalValue}
                  onStepRun={handleStepRun}
                  editorRef={editorRef}
                />
              </React.Suspense>
            )}
          </EuiFlexItem>
          {isVisualEditorEnabled && (
            <EuiFlexItem css={styles.visualEditor}>
              <React.Suspense fallback={<EuiLoadingSpinner />}>
                <WorkflowVisualEditor />
              </React.Suspense>
            </EuiFlexItem>
          )}
          {isExecutionGraphEnabled && (
            <EuiFlexItem css={styles.visualEditor}>
              <React.Suspense fallback={<EuiLoadingSpinner />}>
                <ExecutionGraph />
              </React.Suspense>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {testStepId && contextOverride && (
          <TestStepModal
            initialcontextOverride={contextOverride}
            onSubmit={({ stepInputs }) => submitStepRun(testStepId, stepInputs)}
            onClose={closeModal}
          />
        )}
        <WorkflowDetailConnectorFlyout editorRef={editorRef} />
      </>
    );
  }
);
WorkflowDetailEditor.displayName = 'WorkflowDetailEditor';

const componentStyles = {
  yamlEditor: css({
    flex: 1,
    overflow: 'hidden',
  }),
  splitDiffContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      overflow: 'hidden',
      '> .euiFlexItem': {
        minWidth: 0,
      },
    }),
  splitDiffPane: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: `1px solid ${euiTheme.colors.borderBasePlain}`,
      '&:last-of-type': {
        borderRight: 'none',
      },
    }),
  splitDiffPaneLabel: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 auto',
      padding: '8px 12px',
      borderRadius: euiTheme.border.radius.medium,
      margin: '8px 12px 0',
      alignSelf: 'flex-start',
    }),
  splitDiffPaneLabelText: css({
    fontWeight: 600,
  }),
  splitDiffPaneLabelCurrent: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePrimary ?? euiTheme.colors.lightestShade,
      color: euiTheme.colors.primaryText ?? euiTheme.colors.text,
    }),
  splitDiffPaneLabelPrevious: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseWarning ?? euiTheme.colors.backgroundBasePlain,
      color: euiTheme.colors.warningText ?? euiTheme.colors.text,
    }),
  splitDiffEditor: css({
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  }),
  visualEditor: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
};
