/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID } from '@kbn/workflows';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useWorkflowDetail } from '../../../entities/workflows/model/useWorkflowDetail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { useWorkflowExecution } from '../../../entities/workflows/model/useWorkflowExecution';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { WorkflowEventModal } from '../../../features/run_workflow/ui/workflow_event_modal';
import { TestWorkflowModal } from '../../../features/run_workflow/ui/test_workflow_modal';

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

export function WorkflowDetailPage({ id }: { id: string }) {
  const styles = useMemoCss(componentStyles);
  const { application, chrome, uiSettings, notifications } = useKibana().services;
  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = useWorkflowDetail(id);

  const { activeTab, selectedExecutionId, selectedStepId, setActiveTab } = useWorkflowUrlState();

  const { data: execution } = useWorkflowExecution(selectedExecutionId ?? null);

  const [workflowYaml, setWorkflowYaml] = useState(workflow?.yaml ?? '');
  const originalWorkflowYaml = useMemo(() => workflow?.yaml ?? '', [workflow]);
  const [hasChanges, setHasChanges] = useState(false);

  chrome!.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
      href: application!.getUrlForApp('workflows', { path: '/' }),
    },
    { text: workflow?.name ?? 'Workflow Detail' },
  ]);

  chrome!.docTitle.change([
    workflow?.name ?? 'Workflow Detail',
    i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
  ]);

  const { updateWorkflow, runWorkflow } = useWorkflowActions();
  const canSaveWorkflow =
    Boolean(application?.capabilities.workflowsManagement.updateWorkflow) && hasChanges;
  const canRunWorkflow =
    Boolean(application?.capabilities.workflowsManagement.executeWorkflow) &&
    Boolean(workflow?.enabled);
  const canTestWorkflow = Boolean(application?.capabilities.workflowsManagement.executeWorkflow);

  const handleSave = () => {
    if (!id) {
      notifications?.toasts.addError(new Error('Workflow is not loaded'), {
        toastLifeTimeMs: 3000,
        title: i18n.translate('workflows.workflowDetailHeader.error.workflowNotLoaded', {
          defaultMessage: 'Workflow is not loaded',
        }),
      });
      return;
    }
    updateWorkflow.mutate(
      {
        id,
        workflow: {
          yaml: workflowYaml,
        },
      },
      {
        onError: (err: unknown) => {
          notifications?.toasts.addError(err as Error, {
            toastLifeTimeMs: 3000,
            title: 'Failed to save workflow',
          });
        },
      }
    );
  };

  const [workflowEventModalOpen, setWorkflowEventModalOpen] = useState(false);
  const [testWorkflowModalOpen, setTestWorkflowModalOpen] = useState(false);

  const handleRunClick = () => {
    setWorkflowEventModalOpen(true);
  };

  const handleRunWorkflow = (event: Record<string, any>) => {
    if (!workflow) {
      notifications?.toasts.addError(new Error('Workflow is not loaded'), {
        toastLifeTimeMs: 3000,
        title: i18n.translate('workflows.workflowDetailHeader.error.workflowNotLoaded', {
          defaultMessage: 'Workflow is not loaded',
        }),
      });
      return;
    }
    runWorkflow.mutate(
      { id, inputs: event },
      {
        onSuccess: ({ workflowExecutionId }) => {
          notifications?.toasts.addSuccess('Workflow run started', {
            toastLifeTimeMs: 3000,
          });
          application!.navigateToUrl(
            application!.getUrlForApp('workflows', {
              path: `/${id}?tab=executions&executionId=${workflowExecutionId}`,
            })
          );
        },
        onError: (err: unknown) => {
          notifications?.toasts.addError(err as Error, {
            toastLifeTimeMs: 3000,
            title: 'Failed to run workflow',
          });
        },
      }
    );
  };

  const handleToggleWorkflow = useCallback(() => {
    if (!workflow) {
      notifications?.toasts.addError(new Error('Workflow is not loaded'), {
        toastLifeTimeMs: 3000,
        title: i18n.translate('workflows.workflowDetailHeader.error.workflowNotLoaded', {
          defaultMessage: 'Workflow is not loaded',
        }),
      });
      return;
    }
    updateWorkflow.mutate(
      {
        id,
        workflow: {
          enabled: !workflow.enabled,
        },
      },
      {
        onError: (err: unknown) => {
          notifications?.toasts.addError(err as Error, {
            toastLifeTimeMs: 3000,
            title: 'Failed to update workflow',
          });
        },
      }
    );
  }, [notifications?.toasts, updateWorkflow, id, workflow]);

  const isVisualEditorEnabled = uiSettings?.get<boolean>(
    WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
    false
  );

  useEffect(() => {
    setWorkflowYaml(workflow?.yaml ?? '');
    setHasChanges(false);
  }, [workflow]);

  const handleChange = (wfString: string) => {
    setWorkflowYaml(wfString);
    setHasChanges(originalWorkflowYaml !== wfString);
  };

  if (workflowError) {
    const error = workflowError as Error;
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>Unable to load workflow</h2>}
        body={<p>There was an error loading the workflow. {error.message}</p>}
      />
    );
  }

  return (
    <div css={styles.pageContainer}>
      <WorkflowDetailHeader
        name={workflow?.name}
        isLoading={isLoadingWorkflow}
        activeTab={activeTab}
        canRunWorkflow={canRunWorkflow}
        canSaveWorkflow={canSaveWorkflow}
        isEnabled={workflow?.enabled ?? false}
        handleRunClick={handleRunClick}
        handleSave={handleSave}
        handleToggleWorkflow={handleToggleWorkflow}
        canTestWorkflow={canTestWorkflow}
        handleTestClick={() => setTestWorkflowModalOpen(true)}
        handleTabChange={(tab) => {
          setActiveTab(tab);
        }}
      />
      <EuiFlexGroup gutterSize="none" css={styles.container}>
        {activeTab === 'executions' && (
          <EuiFlexItem css={styles.executionListColumn}>
            <WorkflowExecutionList workflowId={workflow?.id ?? null} />
          </EuiFlexItem>
        )}
        <EuiFlexItem css={styles.workflowMainColumn}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem css={styles.workflowYamlEditorColumn}>
              <React.Suspense fallback={<EuiLoadingSpinner />}>
                <WorkflowYAMLEditor
                  workflowId={workflow?.id ?? 'unknown'}
                  filename={`${workflow?.id ?? 'unknown'}.yaml`}
                  value={workflowYaml}
                  onChange={(v) => handleChange(v ?? '')}
                  lastUpdatedAt={workflow?.lastUpdatedAt}
                  hasChanges={hasChanges}
                  highlightStep={selectedStepId}
                  stepExecutions={execution?.stepExecutions}
                />
              </React.Suspense>
            </EuiFlexItem>
            {isVisualEditorEnabled && workflow && (
              <EuiFlexItem css={styles.workflowVisualEditorColumn}>
                <React.Suspense fallback={<EuiLoadingSpinner />}>
                  <WorkflowVisualEditor
                    workflowYaml={workflowYaml}
                    workflowExecutionId={selectedExecutionId}
                  />
                </React.Suspense>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {selectedExecutionId && (
          <EuiFlexItem css={styles.stepExecutionListColumn}>
            {workflow && (
              <WorkflowExecutionDetail
                workflowExecutionId={selectedExecutionId}
                workflowYaml={workflow.yaml}
              />
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {workflowEventModalOpen && (
        <WorkflowEventModal
          onClose={() => setWorkflowEventModalOpen(false)}
          onSubmit={handleRunWorkflow}
        />
      )}
      {testWorkflowModalOpen && (
        <TestWorkflowModal
          workflowYaml={workflowYaml}
          onClose={() => setTestWorkflowModalOpen(false)}
        />
      )}
    </div>
  );
}

const componentStyles = {
  pageContainer: css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
  }),
  container: css`
    flex: 1;
    height: 100%;
    min-height: 0;
    flex-wrap: nowrap !important;
  `,
  executionListColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexBasis: '200px',
      maxWidth: '200px',
      flex: 1,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderRight: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  workflowMainColumn: css({
    flex: 1,
    overflow: 'hidden',
  }),
  workflowYamlEditorColumn: css({
    flex: 1,
    overflow: 'hidden',
  }),
  workflowVisualEditorColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  stepExecutionListColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexBasis: '275px',
      maxWidth: '275px',
      flex: 1,
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
};
