/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isMac } from '@kbn/shared-ux-utility';
import { useDispatch, useSelector } from 'react-redux';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { monaco } from '@kbn/monaco';
import { WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID } from '@kbn/workflows';
import { useWorkflowsCapabilities, WorkflowDetailBottomBar } from '@kbn/workflows-ui';
import { useContextOverrideData } from './use_context_override_data';
import { WorkflowDetailConnectorFlyout } from './workflow_detail_connector_flyout';
import { WORKFLOWS_DOCUMENTATION_URL } from '../../../../common';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import {
  selectEditorWorkflowLookup,
  selectHasChanges,
  selectIsExecutionsTab,
  selectIsYamlSyntaxValid,
  selectWorkflowId,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  HIGHLIGHTED_STEP_TRIGGER,
  setHighlightedStepId,
  setIsTestModalOpen,
  setTestStepModalOpenStepId,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { ExecutionGraph } from '../../../features/debug_graph/execution_graph';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { getTestRunTooltipContent } from '../../../shared/ui';
import {
  EditorSettingsPopover,
  KeyboardShortcutsPopover,
} from '../../../widgets/workflow_yaml_editor';

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
}

export const WorkflowDetailEditor = React.memo<WorkflowDetailEditorProps>(({ highlightDiff }) => {
  const styles = useMemoCss(componentStyles);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const openActionsRef = useRef<(() => void) | null>(null);
  const dispatch = useDispatch();

  const workflowYaml = useSelector(selectYamlString) ?? '';
  const workflowId = useSelector(selectWorkflowId);
  const getContextOverrideData = useContextOverrideData();
  const { runIndividualStep } = useWorkflowActions();
  const { notifications } = useKibana().services;
  const { setSelectedExecution } = useWorkflowUrlState();
  const { canExecuteWorkflow } = useWorkflowsCapabilities();

  const handleStepRun = useCallback(
    async (params: { stepId: string; actionType: string }) => {
      if (params.actionType !== 'run') {
        return;
      }

      if (!canExecuteWorkflow) {
        return;
      }

      const contextOverrideData = getContextOverrideData(params.stepId);
      if (!contextOverrideData) {
        return;
      }

      if (!Object.keys(contextOverrideData.stepContext).length) {
        try {
          const response = await runIndividualStep.mutateAsync({
            workflowId,
            stepId: params.stepId,
            workflowYaml,
            contextOverride: {},
          });
          setSelectedExecution(response.workflowExecutionId);
        } catch (error) {
          const errorMessage =
            (error as { body?: { message?: string }; message?: string })?.body?.message ||
            (error as Error)?.message ||
            'An unexpected error occurred while running the step';
          notifications.toasts.addError(new Error(errorMessage), {
            title: i18n.translate('workflows.detail.submitStepRun.error', {
              defaultMessage: 'Failed to run step',
            }),
          });
        }
        return;
      }

      dispatch(setTestStepModalOpenStepId(params.stepId));
    },
    [
      workflowId,
      getContextOverrideData,
      runIndividualStep,
      workflowYaml,
      setSelectedExecution,
      dispatch,
      notifications.toasts,
      canExecuteWorkflow,
    ]
  );

  const isExecutionGraphEnabled = useKibana().services.uiSettings?.get<boolean>(
    WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
    false
  );

  const { editorView, setEditorView } = useWorkflowUrlState();
  const showGraph = editorView === 'graph';

  const hasUnsavedChanges = useSelector(selectHasChanges);
  const isSyntaxValid = useSelector(selectIsYamlSyntaxValid);
  const isExecutionsTab = useSelector(selectIsExecutionsTab);
  const workflowLookup = useSelector(selectEditorWorkflowLookup);

  const handleEditorViewChange = useCallback(
    (next: 'yaml' | 'graph') => {
      // When switching from YAML to graph, focus the graph on whatever step
      // the user's cursor is currently on. Looks up the step by the editor's
      // current line in the workflow's lookup table.
      if (next === 'graph' && editorRef.current && workflowLookup) {
        const pos = editorRef.current.getPosition();
        const line = pos?.lineNumber;
        if (line != null) {
          const tStart = workflowLookup.triggersLineStart;
          const tEnd = workflowLookup.triggersLineEnd;
          if (tStart != null && tEnd != null && line >= tStart && line <= tEnd) {
            dispatch(setHighlightedStepId({ stepId: HIGHLIGHTED_STEP_TRIGGER }));
          } else {
            const found = Object.entries(workflowLookup.steps).find(
              ([, info]) =>
                (info as { lineStart: number; lineEnd: number }).lineStart <= line &&
                line <= (info as { lineStart: number; lineEnd: number }).lineEnd
            );
            if (found) {
              dispatch(setHighlightedStepId({ stepId: found[0] }));
            }
          }
        }
      }
      setEditorView(next);
    },
    [dispatch, setEditorView, workflowLookup]
  );

  const [showRunConfirmation, setShowRunConfirmation] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  // Keep the graph mounted for a moment after switching to YAML so the
  // cross-fade animation can play out before unmounting it.
  const [renderGraph, setRenderGraph] = useState(showGraph);
  useEffect(() => {
    if (showGraph) {
      setRenderGraph(true);
      return;
    }
    const t = setTimeout(() => setRenderGraph(false), 260);
    return () => clearTimeout(t);
  }, [showGraph]);

  const openTestModal = useCallback(() => {
    dispatch(setIsTestModalOpen(true));
  }, [dispatch]);

  const handleRunClickWithUnsavedCheck = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowRunConfirmation(true);
    } else {
      openTestModal();
    }
  }, [hasUnsavedChanges, openTestModal]);

  const handleConfirmRun = useCallback(() => {
    setShowRunConfirmation(false);
    openTestModal();
  }, [openTestModal]);

  const handleCancelRun = useCallback(() => {
    setShowRunConfirmation(false);
  }, []);

  const runWorkflowTooltipContent = useMemo(
    () =>
      getTestRunTooltipContent({
        isExecutionsTab,
        isValid: isSyntaxValid,
        canRunWorkflow: canExecuteWorkflow,
      }),
    [isExecutionsTab, isSyntaxValid, canExecuteWorkflow]
  );

  const runDisabled = isExecutionsTab || !canExecuteWorkflow || !isSyntaxValid;

  const testWorkflowButton = (
    <EuiToolTip content={runWorkflowTooltipContent}>
      <EuiButton
        color="success"
        iconType="play"
        size="m"
        onClick={handleRunClickWithUnsavedCheck}
        isDisabled={runDisabled}
        data-test-subj="testWorkflowButton"
      >
        <FormattedMessage
          id="workflows.workflowDetailEditor.testWorkflow"
          defaultMessage="Test workflow"
        />
      </EuiButton>
    </EuiToolTip>
  );

  const commandKey = isMac ? '⌘' : 'Ctrl';
  const documentationLabel = i18n.translate('workflows.workflowDetailEditor.tools.documentation', {
    defaultMessage: 'Documentation',
  });
  const actionsMenuLabel = i18n.translate('workflows.workflowDetailEditor.tools.actionsMenu', {
    defaultMessage: 'Actions menu',
  });

  const toolsSlot = (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={documentationLabel}>
          <EuiButtonIcon
            iconType="documentation"
            href={WORKFLOWS_DOCUMENTATION_URL}
            target="_blank"
            color="text"
            size="s"
            aria-label={documentationLabel}
            data-test-subj="workflowBottomBarDocumentation"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={`${actionsMenuLabel} (${commandKey}+K)`}>
          <EuiButtonIcon
            iconType="search"
            color="text"
            size="s"
            onClick={() => openActionsRef.current?.()}
            aria-label={actionsMenuLabel}
            data-test-subj="workflowBottomBarActionsMenu"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <KeyboardShortcutsPopover />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EditorSettingsPopover editorRef={editorRef} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
        <EuiFlexItem css={styles.yamlEditor}>
          {/*
           * The YAML editor is always mounted so its validation pipeline keeps
           * running. When in graph view, the editor swaps Monaco out for the
           * visual editor in the same flex column so the validation accordion
           * stays pinned at the bottom for both views.
           */}
          <React.Suspense fallback={<EuiLoadingSpinner />}>
            <WorkflowYAMLEditor
              highlightDiff={highlightDiff}
              onStepRun={handleStepRun}
              editorRef={editorRef}
              hideEditorBody={showGraph}
              openActionsRef={openActionsRef}
              onValidationOpenChange={setIsValidationOpen}
              bodyOverride={
                renderGraph ? (
                  <React.Suspense fallback={<EuiLoadingSpinner />}>
                    <WorkflowVisualEditor onStepRun={handleStepRun} />
                  </React.Suspense>
                ) : null
              }
            />
          </React.Suspense>
          <WorkflowDetailBottomBar
            editorView={editorView}
            onEditorViewChange={handleEditorViewChange}
            toolsSlot={toolsSlot}
            testWorkflowButton={testWorkflowButton}
            bottomOffset={isValidationOpen && !showGraph ? 220 : 0}
          />
        </EuiFlexItem>
        {isExecutionGraphEnabled && (
          <EuiFlexItem css={styles.visualEditor}>
            <React.Suspense fallback={<EuiLoadingSpinner />}>
              <ExecutionGraph />
            </React.Suspense>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <WorkflowDetailConnectorFlyout editorRef={editorRef} />
      {showRunConfirmation && (
        <EuiConfirmModal
          data-test-subj="runWorkflowWithUnsavedChangesConfirmationModal"
          title={i18n.translate('workflows.workflowDetailEditor.runWithUnsavedChangesQuestion', {
            defaultMessage: 'Run workflow with unsaved changes?',
          })}
          onCancel={handleCancelRun}
          onConfirm={handleConfirmRun}
          cancelButtonText={i18n.translate('workflows.workflowDetailEditor.runWorkflowCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.workflowDetailEditor.runWorkflow', {
            defaultMessage: 'Run workflow',
          })}
          buttonColor="success"
          defaultFocusedButton="confirm"
        >
          <p>
            <FormattedMessage
              id="workflows.workflowDetailEditor.runWithUnsavedChanges.message"
              defaultMessage="You have unsaved changes. Running the workflow will not save your changes. Are you sure you want to continue?"
            />
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
});
WorkflowDetailEditor.displayName = 'WorkflowDetailEditor';

const componentStyles = {
  yamlEditor: css({
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  }),
  visualEditor: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
};
