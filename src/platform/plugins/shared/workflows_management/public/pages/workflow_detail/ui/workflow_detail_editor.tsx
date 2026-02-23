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
import { css, type SerializedStyles } from '@emotion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { monaco, YAML_LANG_ID } from '@kbn/monaco';
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
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { GlobalWorkflowEditorStyles } from '../../../widgets/workflow_yaml_editor/styles/global_workflow_editor_styles';
import {
  useWorkflowsMonacoTheme,
  WORKFLOWS_MONACO_EDITOR_THEME,
} from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';
import { normalizeForDiff } from '../../../widgets/workflow_yaml_editor/ui/decorations/build_merged_diff_lines';

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

const READ_ONLY_DIFF_OPTIONS: monaco.editor.IEditorOptions = {
  readOnly: true,
  minimap: { enabled: false },
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  renderLineHighlight: 'none',
};

/**
 * Monaco's built-in diff editor (side-by-side, synced scrolling).
 * Container is measured with ResizeObserver and given explicit dimensions so the editor renders.
 */
function MonacoSplitDiffEditor({
  currentYaml,
  previousYaml,
  wrapperCss,
}: {
  currentYaml: string;
  previousYaml: string;
  wrapperCss?: ReturnType<typeof css>;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const monacoContainerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useWorkflowsMonacoTheme();

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
              const { width, height } = entry.contentRect;
              setSize({ width: Math.floor(width), height: Math.floor(height) });
            }
          })
        : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  useEffect(() => {
    const container = monacoContainerRef.current;
    if (!container || size.width <= 0 || size.height <= 0) return;

    const original = monaco.editor.createModel(currentYaml, YAML_LANG_ID);
    const modified = monaco.editor.createModel(previousYaml, YAML_LANG_ID);

    if (!diffEditorRef.current) {
      diffEditorRef.current = monaco.editor.createDiffEditor(container, {
        automaticLayout: true,
        theme: WORKFLOWS_MONACO_EDITOR_THEME,
        readOnly: true,
        renderSideBySide: true,
        enableSplitViewResizing: true,
      });
    }

    diffEditorRef.current.setModel({ original, modified });
    diffEditorRef.current.updateOptions(READ_ONLY_DIFF_OPTIONS);
    diffEditorRef.current.getOriginalEditor().updateOptions(READ_ONLY_DIFF_OPTIONS);
    diffEditorRef.current.getModifiedEditor().updateOptions(READ_ONLY_DIFF_OPTIONS);

    return () => {
      original.dispose();
      modified.dispose();
    };
  }, [currentYaml, previousYaml, size.width, size.height]);

  useEffect(() => {
    return () => {
      diffEditorRef.current?.dispose();
      diffEditorRef.current = null;
    };
  }, []);

  const hasSize = size.width > 0 && size.height > 0;

  return (
    <div
      ref={measureRef}
      css={wrapperCss ?? undefined}
      data-test-subj="workflowMonacoDiffEditorWrapper"
    >
      {hasSize && (
        <div
          ref={monacoContainerRef}
          style={{ width: size.width, height: size.height }}
          data-test-subj="workflowMonacoDiffEditor"
        />
      )}
    </div>
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

    return (
      <>
        {isSplitDiffView && <GlobalWorkflowEditorStyles />}
        <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
          <EuiFlexItem css={styles.yamlEditor}>
            {isSplitDiffView ? (
              <EuiFlexGroup
                gutterSize="none"
                css={styles.splitDiffContainer}
                direction="column"
                alignItems="stretch"
              >
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="none" css={styles.splitDiffLabelRow}>
                    <EuiFlexItem grow={1} css={styles.splitDiffPaneLabelWrapper}>
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
                    </EuiFlexItem>
                    <EuiFlexItem grow={1} css={styles.splitDiffPaneLabelWrapper}>
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
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={1} css={styles.splitDiffEditorWrapper}>
                  <MonacoSplitDiffEditor
                    currentYaml={normalizeForDiff(workflowYaml)}
                    previousYaml={normalizeForDiff(diffOriginalValue)}
                    wrapperCss={styles.splitDiffEditor as SerializedStyles}
                  />
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
  splitDiffLabelRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  splitDiffEditorWrapper: css({
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden',
  }),
  splitDiffPaneLabelWrapper: css({
    flex: '0 0 auto',
    display: 'flex',
    justifyContent: 'center',
    padding: '10px 12px 8px',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  }),
  splitDiffPaneLabel: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: '6px 14px',
      borderRadius: euiTheme.border.radius.medium,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    }),
  splitDiffPaneLabelText: css({
    fontWeight: 600,
    fontSize: '13px',
  }),
  splitDiffPaneLabelCurrent: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePrimary,
      color: euiTheme.colors.primary,
    }),
  splitDiffPaneLabelPrevious: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundLightWarning,
      color: euiTheme.colors.warningText,
    }),
  splitDiffEditor: css({
    width: '100%',
    height: '100%',
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
