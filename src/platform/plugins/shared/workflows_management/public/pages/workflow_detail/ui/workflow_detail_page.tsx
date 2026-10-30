/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useLocation } from 'react-router-dom';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { AppHeader } from '@kbn/app-header';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowsCapabilities, type WorkflowsCreateRouteState } from '@kbn/workflows-ui';
import { workflowDefaultYaml } from './workflow_default_yml';
import { WorkflowDetailEditor } from './workflow_detail_editor';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { WorkflowEditorLayout } from './workflow_detail_layout';
import { WorkflowDetailLoadingState } from './workflow_detail_loading_state';
import { WorkflowDetailTestModal } from './workflow_detail_test_modal';
import { WorkflowDetailTestStepModal } from './workflow_detail_test_step_modal';
import { WorkflowNotFoundPage } from './workflow_not_found_page';
import { PLUGIN_ID, WORKFLOWS_DOCUMENTATION_URL } from '../../../../common';
import type { WorkflowDetailTab } from '../../../common/lib/telemetry/events/workflows/ui/types';
import { AgenticFirstEmptyStateLive } from '../../../components';
import { WorkflowsPageName } from '../../../deep_links';
import {
  setActiveTab,
  setExecution,
  setIsTestModalOpen,
  setReplayExecutionId,
  setYamlString,
} from '../../../entities/workflows/store';
import {
  selectActiveTab,
  selectWorkflowDefinition,
  selectWorkflowId,
  selectWorkflowName,
  selectWorkflowTags,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { loadConnectorsThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_connectors_thunk';
import { loadWorkflowThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_workflow_thunk';
import { loadWorkflowsThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_workflows_thunk';
import { WorkflowChangeHistoryProvider } from '../../../features/change_history';
import { WorkflowExecutionFlyout } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail_old';
import { WorkflowExecutionListFlyout } from '../../../features/workflow_execution_list/ui/workflow_execution_list_flyout';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list_old';
import { useAsyncThunkState } from '../../../hooks/use_async_thunk';
import { useAutoCollapseSideNav } from '../../../hooks/use_auto_collapse_side_nav';
import { useGlobalExecutionsViewEnabled } from '../../../hooks/use_global_executions_view_enabled';
import { useKibana } from '../../../hooks/use_kibana';
import { useTelemetry } from '../../../hooks/use_telemetry';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import {
  navigateToWorkflowsList,
  type WorkflowDetailRouteState,
} from '../../../shared/utils/workflow_navigation';

/**
 * `location.state` the page can arrive with: list-navigation state (back
 * link) and, on `/create`, the cross-app initial-content contract
 * (`WorkflowsCreateRouteState`, e.g. "Remix with AI" or the landing prompt).
 */
type WorkflowDetailLocationState = WorkflowDetailRouteState & WorkflowsCreateRouteState;

interface PendingAgentPrompt {
  message: string;
  attachments: ConversationAttachment[];
}

const isLoadWorkflowNotFoundError = (error: unknown) =>
  isHttpFetchError(error) && error.response?.status === 404;

const getLoadWorkflowErrorMessage = (error: unknown) =>
  (isHttpFetchError(error) ? (error.body as { message?: string })?.message : undefined) ||
  (error instanceof Error ? error.message : String(error));

export function WorkflowDetailPage({ id }: { id?: string }) {
  const dispatch = useDispatch();
  const [loadConnectors, { isLoading: isLoadingConnectors }] =
    useAsyncThunkState(loadConnectorsThunk);
  const [loadWorkflows] = useAsyncThunkState(loadWorkflowsThunk);
  const [loadWorkflow, { isLoading: isLoadingWorkflow, error }] =
    useAsyncThunkState(loadWorkflowThunk);
  const telemetry = useTelemetry();
  const { application } = useKibana().services;
  const location = useLocation<WorkflowDetailLocationState | undefined>();
  const { euiTheme } = useEuiTheme();

  const isReady = !isLoadingWorkflow && !isLoadingConnectors;

  const activeTabInStore = useSelector(selectActiveTab);
  const workflowId = useSelector(selectWorkflowId);
  const workflowName = useSelector(selectWorkflowName);
  const workflowTags = useSelector(selectWorkflowTags);
  const workflowDefinition = useSelector(selectWorkflowDefinition);

  useWorkflowsBreadcrumbs(workflowName);

  useAutoCollapseSideNav();

  const { canExecuteWorkflow, canReadWorkflowExecution } = useWorkflowsCapabilities();
  const isExecutionsViewEnabled = useGlobalExecutionsViewEnabled();
  const {
    activeTab,
    isViewingExecution,
    selectedExecutionId,
    setSelectedExecution,
    setActiveTab: setUrlTab,
    replayExecutionId,
    replayIsTestRun,
    clearReplayExecutionId,
  } = useWorkflowUrlState();

  useEffect(() => {
    if (!canReadWorkflowExecution) {
      if (activeTab === 'executions') {
        setUrlTab('workflow', { replace: true });
      }
      if (selectedExecutionId) {
        setSelectedExecution(null, { replace: true });
      }
    }
  }, [canReadWorkflowExecution, activeTab, selectedExecutionId, setUrlTab, setSelectedExecution]);

  // Report detail viewed telemetry when page is ready
  useEffect(() => {
    if (isReady && workflowId && activeTab) {
      const tab: WorkflowDetailTab = activeTab;
      telemetry.reportWorkflowDetailViewed({
        workflowId,
        tab,
        editorType: 'yaml',
      });
    }
  }, [isReady, workflowId, activeTab, telemetry]);

  useEffect(() => {
    loadConnectors(); // dispatch load connectors on mount
    loadWorkflows(); // dispatch load workflows on mount
  }, [loadConnectors, loadWorkflows]);

  // Seed the editor once per create-session: tracks whether the editor was
  // already seeded so URL-state churn and re-renders never clobber in-progress
  // edits or re-fire telemetry.
  const seededRef = useRef(false);

  // A navigation can hand `/create` its initial content through history
  // state (`WorkflowsCreateRouteState`) — e.g. the Template library's
  // "Remix with AI" passes the rendered template. The state travels on the
  // history entry, not the URL, so plain `/create` links and shared URLs
  // fall back to the default YAML. The effect below depends on this value, not
  // on `location.state`, which `useWorkflowUrlState` rewrites on URL updates.
  const { initialYaml } = location.state ?? {};

  // Load workflow when id changes
  useEffect(() => {
    if (id) {
      seededRef.current = false;
      loadWorkflow({ id }); // sets loaded yaml string
      return;
    }
    if (seededRef.current) {
      return;
    }
    seededRef.current = true;

    dispatch(setYamlString(initialYaml || workflowDefaultYaml));
    telemetry.reportWorkflowCreateOpened({ editorType: 'yaml' });
  }, [loadWorkflow, id, dispatch, telemetry, initialYaml]);

  // The store tab picks what the editor shows: a run snapshot only once a run is selected.
  // The open execution list alone keeps the editable draft.
  const editorTab = isViewingExecution ? 'executions' : 'workflow';
  useEffect(() => {
    if (activeTabInStore !== editorTab) {
      dispatch(setActiveTab(editorTab));
    }
  }, [editorTab, activeTabInStore, dispatch]);

  useEffect(() => {
    if (
      !isReady ||
      !replayExecutionId ||
      !canExecuteWorkflow ||
      !workflowDefinition ||
      !id ||
      workflowId !== id
    ) {
      return;
    }

    dispatch(setReplayExecutionId({ executionId: replayExecutionId, isTestRun: replayIsTestRun }));
    dispatch(setIsTestModalOpen(true));
    clearReplayExecutionId();
  }, [
    canExecuteWorkflow,
    clearReplayExecutionId,
    dispatch,
    id,
    isReady,
    replayExecutionId,
    replayIsTestRun,
    workflowDefinition,
    workflowId,
  ]);

  // Load execution when selectedExecutionId changes
  useEffect(() => {
    if (!selectedExecutionId) {
      dispatch(setExecution(undefined));
    }
  }, [selectedExecutionId, dispatch]);

  // TODO: manage it in a workflow state context
  const [highlightDiff, setHighlightDiff] = useState(false);
  // Flyout mode keeps the list open while the URL is on the executions tab.
  const isExecutionListOpen = activeTab === 'executions';

  // Closing the list alone pushes, so Back reopens it. Closing a selected run must replace, or
  // Back reopens the run.
  const closeExecutionList = useCallback(() => {
    setUrlTab('workflow', { replace: Boolean(selectedExecutionId) });
  }, [selectedExecutionId, setUrlTab]);

  const onOpenExecutionList = useCallback(() => {
    if (isExecutionListOpen || selectedExecutionId) {
      closeExecutionList();
      return;
    }
    setUrlTab('executions');
  }, [closeExecutionList, isExecutionListOpen, selectedExecutionId, setUrlTab]);

  // `/create` starts on the agentic-first landing. `?startBlank=true` ("Start manually"
  // on the empty list) skips it.
  const startBlank = new URLSearchParams(location.search).get('startBlank') === 'true';
  // Prompt from this page's landing or from the empty list (`location.state`).
  const [pendingPrompt, setPendingPrompt] = useState<PendingAgentPrompt | undefined>(() => {
    const message = !id ? location.state?.initialAgentMessage : undefined;
    return message
      ? { message, attachments: location.state?.initialAgentAttachments ?? [] }
      : undefined;
  });
  // "Remix with AI" arrives with the template YAML, so it skips the landing too.
  const shouldShowAgenticLandingRef = useRef(false);
  shouldShowAgenticLandingRef.current = !id && !startBlank && !pendingPrompt && !initialYaml;
  const [showAgenticLanding, setShowAgenticLanding] = useState(shouldShowAgenticLandingRef.current);
  // Re-check only when the route switches between `/create` and `/:id`. URL
  // churn on `/create` (view toggle, run selection) drops the query and the
  // history state, and must not bring the landing back over the editor.
  useEffect(() => {
    setShowAgenticLanding(shouldShowAgenticLandingRef.current);
  }, [id]);
  // The sidebar opens only when the user picked AI: a landing prompt or a remix.
  // "Start manually" goes straight to the editor.
  const autoOpenAgentChat = !id && Boolean(pendingPrompt || initialYaml);

  const handleLandingSubmit = useCallback(
    (message: string, attachments: ConversationAttachment[]) => {
      setPendingPrompt({ message, attachments });
      setShowAgenticLanding(false);
    },
    []
  );

  const onCloseExecutionDetail = useCallback(() => {
    // Clear the selected execution but keep the tab, so a run opened from the list goes back to
    // the list. Push so Back reopens the run.
    setSelectedExecution(null);
  }, [setSelectedExecution]);

  // Close the execution flyouts and open the Workflow tab, where the agent's proposal shows.
  const onAgentProposalHeld = useCallback(() => {
    setUrlTab('workflow');
  }, [setUrlTab]);

  const onBackToWorkflows = useCallback(() => {
    void navigateToWorkflowsList(application, location.state);
  }, [application, location.state]);

  if (error) {
    if (isLoadWorkflowNotFoundError(error)) {
      return <WorkflowNotFoundPage onBackToWorkflows={onBackToWorkflows} />;
    }

    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowDetail.error.title"
              defaultMessage="Unable to load workflow"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="workflows.workflowDetail.error.body"
              defaultMessage="There was an error loading the workflow. {error}"
              values={{ error: getLoadWorkflowErrorMessage(error) }}
            />
          </p>
        }
      />
    );
  }

  // The list needs a saved workflow id. The detail flyout only needs the selected
  // execution, including a test run of a workflow that has not been saved yet.
  const canShowExecutionUi = isExecutionsViewEnabled && canReadWorkflowExecution;
  const sidebarExecutionList =
    !isExecutionsViewEnabled &&
    id &&
    activeTab === 'executions' &&
    !selectedExecutionId &&
    canReadWorkflowExecution ? (
      <WorkflowExecutionList workflowId={id} />
    ) : null;
  const sidebarExecutionDetail =
    !isExecutionsViewEnabled && selectedExecutionId && canReadWorkflowExecution ? (
      <WorkflowExecutionDetail executionId={selectedExecutionId} onClose={onCloseExecutionDetail} />
    ) : null;
  // A run in the URL (e.g. a draft test run) means the user is past the landing.
  if (!id && showAgenticLanding && !selectedExecutionId) {
    return (
      <EuiPageTemplate
        offset={0}
        css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}
        data-test-subj="newWorkflowPage"
      >
        <AppHeader
          title={i18n.translate('workflows.newWorkflow.title', {
            defaultMessage: 'New workflow',
          })}
          back={{
            href: application.getUrlForApp(PLUGIN_ID),
            label: i18n.translate('workflows.newWorkflow.backLinkLabel', {
              defaultMessage: 'Workflows',
            }),
            onClick: (event) => {
              event.preventDefault();
              onBackToWorkflows();
            },
          }}
          docLink={WORKFLOWS_DOCUMENTATION_URL}
          showAddIntegrations
          spacing="compact"
        />
        {/* Full-width content, or centering shrinks the landing to its content. */}
        <EuiPageTemplate.Section
          restrictWidth={false}
          grow
          alignment="center"
          contentProps={{ css: { width: '100%' } }}
        >
          <AgenticFirstEmptyStateLive
            onSubmitPrompt={handleLandingSubmit}
            onStartManually={() => setShowAgenticLanding(false)}
            onSelectTemplate={(template) =>
              application.navigateToApp(PLUGIN_ID, {
                deepLinkId: WorkflowsPageName.library,
                path: template.slug,
              })
            }
            onExploreLibrary={() =>
              application.navigateToApp(PLUGIN_ID, { deepLinkId: WorkflowsPageName.library })
            }
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  const pageContent = (
    <EuiFlexGroup direction="column" gutterSize="none" css={kbnFullBodyHeightCss()}>
      <EuiFlexItem grow={false}>
        <WorkflowDetailHeader
          isLoading={isLoadingWorkflow}
          highlightDiff={highlightDiff}
          setHighlightDiff={setHighlightDiff}
          onOpenExecutionList={canShowExecutionUi && id ? onOpenExecutionList : undefined}
        />
      </EuiFlexItem>
      <EuiFlexItem css={css({ overflow: 'hidden', minHeight: 0 })}>
        {!isReady ? (
          <WorkflowDetailLoadingState />
        ) : (
          <>
            <WorkflowEditorLayout
              editor={
                <WorkflowDetailEditor
                  highlightDiff={highlightDiff}
                  onAgentProposalHeld={onAgentProposalHeld}
                  initialAgentMessage={pendingPrompt?.message}
                  initialAgentAttachments={pendingPrompt?.attachments}
                  autoOpenAgentChat={autoOpenAgentChat}
                />
              }
              executionList={sidebarExecutionList}
              executionDetail={sidebarExecutionDetail}
            />
            {/* Unmount while a run is open. A hidden list flyout keeps EUI's focus trap and
                moves focus to the skip link. Filters and the highlighted row live in the URL. */}
            {canShowExecutionUi && id && isExecutionListOpen && !selectedExecutionId && (
              <WorkflowExecutionListFlyout workflowId={id} onClose={closeExecutionList} />
            )}
            {canShowExecutionUi && selectedExecutionId && (
              <WorkflowExecutionFlyout
                executionId={selectedExecutionId}
                workflowName={workflowName ?? ''}
                workflowTags={workflowTags}
                onClose={onCloseExecutionDetail}
              />
            )}
          </>
        )}
        <WorkflowDetailTestModal />
        <WorkflowDetailTestStepModal />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  if (!id) {
    return pageContent;
  }

  return (
    <WorkflowChangeHistoryProvider workflowId={id} workflowName={workflowName ?? workflowId}>
      {pageContent}
    </WorkflowChangeHistoryProvider>
  );
}
