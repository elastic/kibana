/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { renderTemplate } from '@kbn/workflows-library';
import { useTemplate, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { workflowDefaultYaml } from './workflow_default_yml';
import { WorkflowDetailEditor } from './workflow_detail_editor';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { WorkflowEditorLayout } from './workflow_detail_layout';
import { WorkflowDetailLoadingState } from './workflow_detail_loading_state';
import { WorkflowDetailTestModal } from './workflow_detail_test_modal';
import { WorkflowDetailTestStepModal } from './workflow_detail_test_step_modal';
import { WorkflowNotFoundPage } from './workflow_not_found_page';
import type { WorkflowDetailTab } from '../../../common/lib/telemetry/events/workflows/ui/types';
import { setActiveTab, setExecution, setYamlString } from '../../../entities/workflows/store';
import {
  selectActiveTab,
  selectWorkflowId,
  selectWorkflowName,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { loadConnectorsThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_connectors_thunk';
import { loadWorkflowThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_workflow_thunk';
import { loadWorkflowsThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_workflows_thunk';
import { WorkflowChangeHistoryProvider } from '../../../features/change_history';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useAsyncThunkState } from '../../../hooks/use_async_thunk';
import { useKibana } from '../../../hooks/use_kibana';
import { useTelemetry } from '../../../hooks/use_telemetry';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { getFromTemplateSlug } from '../../../shared/utils/template_prefill';
import {
  navigateToWorkflowsList,
  type WorkflowDetailRouteState,
} from '../../../shared/utils/workflow_navigation';

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
  const location = useLocation<WorkflowDetailRouteState | undefined>();

  // On `/create`, an optional `?fromTemplate=<slug>` seeds the editor from a
  // Workflow Template Library template. The slug is stable, so the link
  // survives refreshes and can be shared. The URL query also mutates during
  // normal editing (view toggle, step selection — `history.replace` in
  // `useWorkflowUrlState`), so seeding is guarded to run once per slug below
  // rather than on every `location.search` change.
  const fromTemplateSlug = useMemo(
    () => (id ? undefined : getFromTemplateSlug(location.search)),
    [id, location.search]
  );
  const {
    data: fromTemplate,
    // Not `isLoading`: in react-query v4 a disabled query (no slug) reports
    // `isLoading: true` forever, which would deadlock `isReady` below.
    isInitialLoading: isLoadingTemplate,
    isError: isTemplateError,
  } = useTemplate(fromTemplateSlug);

  const isReady = !isLoadingWorkflow && !isLoadingConnectors && !isLoadingTemplate;

  const activeTabInStore = useSelector(selectActiveTab);
  const workflowId = useSelector(selectWorkflowId);
  const workflowName = useSelector(selectWorkflowName);

  useWorkflowsBreadcrumbs(workflowName);

  const { canReadWorkflowExecution } = useWorkflowsCapabilities();
  const {
    activeTab,
    selectedExecutionId,
    setSelectedExecution,
    setActiveTab: setUrlTab,
  } = useWorkflowUrlState();

  useEffect(() => {
    if (!canReadWorkflowExecution) {
      if (activeTab === 'executions') {
        setUrlTab('workflow');
      }
      if (selectedExecutionId) {
        setSelectedExecution(null);
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

  // Seed the editor once per create-session: tracks what the editor was last
  // seeded with (`template:<slug>` or the default) so URL-state churn and
  // re-renders never clobber in-progress edits or re-fire telemetry.
  const seededWithRef = useRef<string | undefined>(undefined);

  // Load workflow when id changes
  useEffect(() => {
    if (id) {
      seededWithRef.current = undefined;
      loadWorkflow({ id }); // sets loaded yaml string
      return;
    }

    if (fromTemplateSlug && !isTemplateError) {
      if (!fromTemplate) {
        return; // still fetching — `isReady` keeps the loading state up
      }
      const seedKey = `template:${fromTemplateSlug}`;
      if (seededWithRef.current === seedKey) {
        return;
      }
      seededWithRef.current = seedKey;
      dispatch(setYamlString(renderTemplate({ template: fromTemplate })));
      telemetry.reportWorkflowCreateOpened({ editorType: 'yaml' });
      return;
    }

    // Plain `/create`, or the template failed to load before any seed — fall
    // back to the default YAML without erroring. Never override an editor
    // already seeded from a template: a background refetch (refetch-on-focus)
    // can flip `isTemplateError` to `true` while the last-good `data` is still
    // present, which would otherwise wipe the user's in-progress edits.
    if (seededWithRef.current === 'default' || seededWithRef.current?.startsWith('template:')) {
      return;
    }
    seededWithRef.current = 'default';
    dispatch(setYamlString(workflowDefaultYaml));
    telemetry.reportWorkflowCreateOpened({ editorType: 'yaml' });
  }, [loadWorkflow, id, dispatch, telemetry, fromTemplateSlug, fromTemplate, isTemplateError]);

  // Sync activeTab from URL state to store
  useEffect(() => {
    if (activeTabInStore !== activeTab) {
      dispatch(setActiveTab(activeTab));
    }
  }, [activeTab, activeTabInStore, dispatch]);

  // Load execution when selectedExecutionId changes
  useEffect(() => {
    if (!selectedExecutionId) {
      dispatch(setExecution(undefined));
    }
  }, [selectedExecutionId, dispatch]);

  // TODO: manage it in a workflow state context
  const [highlightDiff, setHighlightDiff] = useState(false);

  const onCloseExecutionDetail = useCallback(() => {
    setSelectedExecution(null);
  }, [setSelectedExecution]);

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

  const pageContent = (
    <EuiFlexGroup direction="column" gutterSize="none" css={kbnFullBodyHeightCss()}>
      <EuiFlexItem grow={false}>
        <WorkflowDetailHeader
          isLoading={isLoadingWorkflow}
          highlightDiff={highlightDiff}
          setHighlightDiff={setHighlightDiff}
        />
      </EuiFlexItem>
      <EuiFlexItem css={css({ overflow: 'hidden', minHeight: 0 })}>
        {!isReady ? (
          <WorkflowDetailLoadingState />
        ) : (
          <WorkflowEditorLayout
            editor={<WorkflowDetailEditor highlightDiff={highlightDiff} />}
            executionList={
              id &&
              activeTab === 'executions' &&
              !selectedExecutionId &&
              canReadWorkflowExecution ? (
                <WorkflowExecutionList workflowId={id} />
              ) : null
            }
            executionDetail={
              selectedExecutionId && canReadWorkflowExecution ? (
                <WorkflowExecutionDetail
                  executionId={selectedExecutionId}
                  onClose={onCloseExecutionDetail}
                />
              ) : null
            }
          />
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
