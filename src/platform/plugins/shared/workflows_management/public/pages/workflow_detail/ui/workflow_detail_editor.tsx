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
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiShadow,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import { isMac } from '@kbn/shared-ux-utility';
import {
  WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID,
  WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
} from '@kbn/workflows';
import {
  ReactFlowProvider,
  useWorkflowsCapabilities,
  WorkflowDetailBottomBar,
} from '@kbn/workflows-ui';
import { useContextOverrideData } from './use_context_override_data';
import { useRunWorkflowWithConfirmation } from './use_run_workflow_with_confirmation';
import { WorkflowDetailConnectorFlyout } from './workflow_detail_connector_flyout';
import { WORKFLOWS_DOCUMENTATION_URL } from '../../../../common';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import {
  selectEditorWorkflowDefinition,
  selectFocusedStepId,
  selectFocusedTriggerId,
  selectIsExecutionsTab,
  selectIsSavingYaml,
  selectIsYamlSyntaxValid,
  selectWorkflowId,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  setHighlightedStepId,
  setIsTestModalOpen,
  setTestStepModalOpenStepId,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { ExecutionGraph } from '../../../features/debug_graph/execution_graph';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowEditorReadOnly } from '../../../hooks/use_workflow_editor_read_only';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { useWorkflowsExperimentalUiSetting } from '../../../hooks/use_workflows_experimental_ui_setting';
import {
  getStoredHideControlsMenu,
  setStoredHideControlsMenu,
} from '../../../lib/workflow_editor_preferences';
import { getTestRunTooltipContent } from '../../../shared/ui';
import { EditorSettingsPopover } from '../../../widgets/workflow_yaml_editor/ui/editor_settings_popover';
import {
  type ExtraAction,
  ExtraActionsBar,
} from '../../../widgets/workflow_yaml_editor/ui/extra_actions_bar';
import { KeyboardShortcutsPopover } from '../../../widgets/workflow_yaml_editor/ui/keyboard_shortcuts_popover';

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
  const readOnlyBadgeShadow = useEuiShadow('xl');
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const openActionsRef = useRef<(() => void) | null>(null);

  // "Hide controls menu" toggle (settings popover). When ON the bottom bar
  // auto-collapses to the small pill after 5s; when OFF it stays expanded.
  // Persisted in localStorage so the choice sticks across reloads.
  const [hideControlsMenu, setHideControlsMenu] = useState<boolean>(
    () => getStoredHideControlsMenu() ?? false
  );
  const handleHideControlsMenuChange = useCallback((next: boolean) => {
    setStoredHideControlsMenu(next);
    setHideControlsMenu(next);
  }, []);

  const dispatch = useDispatch();

  const workflowYaml = useSelector(selectYamlString) ?? '';
  const workflowId = useSelector(selectWorkflowId);
  const isExecutionsTab = useSelector(selectIsExecutionsTab);
  const isReadOnly = useWorkflowEditorReadOnly();
  const isSyntaxValid = useSelector(selectIsYamlSyntaxValid);
  const isSaving = useSelector(selectIsSavingYaml);
  const workflowDefinition = useSelector(selectEditorWorkflowDefinition);
  const hasStructure = useMemo(() => {
    const triggers = workflowDefinition?.triggers?.length ?? 0;
    const steps = workflowDefinition?.steps?.length ?? 0;
    return triggers > 0 || steps > 0;
  }, [workflowDefinition]);
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

      // Guard: the run-step handler uses the draft workflow YAML and context, which
      // differ from the execution snapshot shown on the Executions tab. Bail out to
      // prevent running the wrong version.
      if (isExecutionsTab) {
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
      isExecutionsTab,
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

  const isVisualEditorEnabled = useWorkflowsExperimentalUiSetting(
    WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID
  );
  const isExecutionGraphEnabled = useWorkflowsExperimentalUiSetting(
    WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID
  );

  const { editorView, setEditorView, graphDirection, setGraphDirection } = useWorkflowUrlState();
  const showGraph = isVisualEditorEnabled && editorView === 'graph';
  // Creation state: hide the floating bottom bar until the workflow has
  // structure or the user is in YAML (reached via "Edit as YAML").
  const showBottomBar = isVisualEditorEnabled && (editorView === 'yaml' || hasStructure);

  const focusedStepId = useSelector(selectFocusedStepId);
  const focusedTriggerId = useSelector(selectFocusedTriggerId);

  const handleEditorViewChange = useCallback(
    (next: 'yaml' | 'graph') => {
      if (!isVisualEditorEnabled) {
        return;
      }
      // When switching to graph, focus it on whichever step or trigger block
      // the cursor is currently in — derived entirely from Redux state.
      if (next === 'graph') {
        const target = focusedTriggerId ?? focusedStepId;
        if (target) {
          dispatch(setHighlightedStepId({ stepId: target }));
        }
      }
      setEditorView(next);
    },
    [dispatch, focusedStepId, focusedTriggerId, isVisualEditorEnabled, setEditorView]
  );

  const openTestModal = useCallback(() => {
    dispatch(setIsTestModalOpen(true));
  }, [dispatch]);

  const { handleRunClick: handleRunClickWithUnsavedCheck, runConfirmationModal } =
    useRunWorkflowWithConfirmation(openTestModal);

  const runWorkflowTooltipContent = useMemo(
    () =>
      getTestRunTooltipContent({
        isExecutionsTab,
        isValid: Boolean(isSyntaxValid),
        canRunWorkflow: canExecuteWorkflow,
        isSaving: Boolean(isSaving),
      }),
    [isExecutionsTab, isSyntaxValid, canExecuteWorkflow, isSaving]
  );

  const runDisabled = isExecutionsTab || !canExecuteWorkflow || !isSyntaxValid || isSaving;

  const testWorkflowButton = useMemo(
    () => (
      <EuiToolTip content={runWorkflowTooltipContent}>
        <EuiButton
          color="success"
          iconType="play"
          size="m"
          onClick={handleRunClickWithUnsavedCheck}
          isDisabled={runDisabled}
          data-test-subj="workflowBottomBarRunButton"
        >
          {i18n.translate('workflows.workflowDetailEditor.runWorkflow', {
            defaultMessage: 'Run workflow',
          })}
        </EuiButton>
      </EuiToolTip>
    ),
    [runWorkflowTooltipContent, handleRunClickWithUnsavedCheck, runDisabled]
  );

  const testWorkflowButtonCompact = useMemo(
    () => (
      <EuiToolTip content={runWorkflowTooltipContent} disableScreenReaderOutput>
        <EuiButtonIcon
          color="success"
          display="base"
          iconType="play"
          size="s"
          onClick={handleRunClickWithUnsavedCheck}
          disabled={runDisabled}
          aria-label={i18n.translate('workflows.workflowDetailEditor.runWorkflow', {
            defaultMessage: 'Run workflow',
          })}
          data-test-subj="workflowBottomBarRunButtonCompact"
        />
      </EuiToolTip>
    ),
    [runWorkflowTooltipContent, handleRunClickWithUnsavedCheck, runDisabled]
  );

  // Shared Actions menu + Documentation controls for both Graph and YAML views.
  const yamlActionsSlot = useMemo(() => {
    const documentationLabel = i18n.translate(
      'workflows.workflowDetailEditor.tools.documentation',
      {
        defaultMessage: 'Documentation',
      }
    );

    const commandKey = isMac ? '⌘' : 'Ctrl';
    const actionsMenuLabel = i18n.translate('workflows.workflowDetailEditor.tools.actionsMenu', {
      defaultMessage: 'Actions menu',
    });
    const actions: ExtraAction[] = [
      {
        id: 'actions-menu',
        content: (
          <EuiToolTip content={`${actionsMenuLabel} (${commandKey}+K)`}>
            <EuiButtonIcon
              iconType="plus"
              color="text"
              size="s"
              onClick={() => openActionsRef.current?.()}
              aria-label={actionsMenuLabel}
              data-test-subj="workflowBottomBarActionsMenu"
            />
          </EuiToolTip>
        ),
        showInReadOnly: false,
      },
      {
        id: 'documentation',
        content: (
          <EuiToolTip content={documentationLabel} disableScreenReaderOutput>
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
        ),
        showInReadOnly: true,
      },
    ];

    return <ExtraActionsBar actions={actions} isReadOnly={isReadOnly} />;
  }, [isReadOnly]);

  const toolsSlot = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <KeyboardShortcutsPopover isReadOnly={isReadOnly} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EditorSettingsPopover
            editorRef={editorRef}
            graphDirection={graphDirection}
            onGraphDirectionChange={setGraphDirection}
            hideControlsMenu={hideControlsMenu}
            onHideControlsMenuChange={handleHideControlsMenuChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [graphDirection, handleHideControlsMenuChange, hideControlsMenu, isReadOnly, setGraphDirection]
  );

  // Mount the graph on first open and keep it alive so YAML↔graph toggles are
  // instant (no remount / Suspense flash / fade).
  const [renderGraph, setRenderGraph] = useState(showGraph);
  useEffect(() => {
    if (showGraph) setRenderGraph(true);
  }, [showGraph]);

  return (
    <ReactFlowProvider>
      <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
        <EuiFlexItem css={styles.yamlEditor}>
          {/*
           * Two peer layers, both absolutely positioned inside the
           * position:relative yamlEditor flex item:
           *  - Layer 1 (YAML): always mounted so validation keeps running.
           *  - Layer 2 (Graph): mounted after first visit; toggled via visibility.
           * The bottom bar floats (position:absolute) and overlays both layers.
           */}
          <div css={[styles.editorLayer, styles.yamlLayer]} {...(showGraph ? { inert: '' } : {})}>
            <React.Suspense fallback={null}>
              <WorkflowYAMLEditor
                highlightDiff={highlightDiff}
                onStepRun={handleStepRun}
                editorRef={editorRef}
                isActive={!showGraph}
                hideEditorTools={isVisualEditorEnabled}
                openActionsRef={openActionsRef}
                onToggleEditorMode={() => handleEditorViewChange(showGraph ? 'yaml' : 'graph')}
              />
            </React.Suspense>
          </div>
          {isVisualEditorEnabled && renderGraph && (
            <div
              css={[
                styles.editorLayer,
                styles.graphLayer,
                showGraph ? styles.layerVisible : styles.layerHidden,
              ]}
              {...(showGraph ? {} : { inert: '' })}
            >
              <React.Suspense fallback={null}>
                <WorkflowVisualEditor
                  onStepRun={handleStepRun}
                  direction={graphDirection}
                />
              </React.Suspense>
            </div>
          )}
          {isReadOnly && (
            <EuiBadge
              color="warning"
              css={[styles.readOnlyBadge, css(readOnlyBadgeShadow)]}
              data-test-subj="workflowEditorReadOnlyBadge"
            >
              {i18n.translate('workflows.workflowDetailEditor.readOnlyBadge', {
                defaultMessage: 'Read only',
              })}
            </EuiBadge>
          )}
          {showBottomBar && (
            <WorkflowDetailBottomBar
              editorView={editorView}
              onEditorViewChange={handleEditorViewChange}
              yamlActionsSlot={yamlActionsSlot}
              toolsSlot={toolsSlot}
              testWorkflowButton={testWorkflowButton}
              testWorkflowButtonCompact={testWorkflowButtonCompact}
              disableAutoCollapse={!hideControlsMenu}
            />
          )}
        </EuiFlexItem>
        {isExecutionGraphEnabled && (
          <EuiFlexItem css={styles.visualEditor}>
            <React.Suspense fallback={null}>
              <ExecutionGraph />
            </React.Suspense>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <WorkflowDetailConnectorFlyout editorRef={editorRef} />
      {runConfirmationModal}
    </ReactFlowProvider>
  );
});
WorkflowDetailEditor.displayName = 'WorkflowDetailEditor';

const componentStyles = {
  yamlEditor: css({
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  }),
  /** Absolutely-positioned peer layer shared by both the YAML and graph editors. */
  editorLayer: css({
    position: 'absolute',
    inset: 0,
    // display:flex so the YAML editor's internal flex:1 root stretches to fill
    display: 'flex',
    flexDirection: 'column',
  }),
  yamlLayer: css({
    zIndex: 0,
  }),
  graphLayer: ({ euiTheme }: UseEuiTheme) =>
    css({
      zIndex: 1,
      background: euiTheme.colors.backgroundBaseSubdued,
    }),
  layerVisible: css({
    opacity: 1,
    pointerEvents: 'auto',
  }),
  layerHidden: css({
    opacity: 0,
    pointerEvents: 'none',
  }),
  readOnlyBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      insetBlockStart: euiTheme.size.base,
      insetInlineStart: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2,
      paddingInline: euiTheme.size.l,
    }),
  visualEditor: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
};
