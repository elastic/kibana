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
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { StepContext } from '@kbn/workflows';
import {
  WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
  WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
} from '@kbn/workflows';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { StepContextMockData } from '../../../shared/utils/build_step_context_mock/build_step_context_mock';
import { SingleStepExecution } from '../../../features/workflow_execution_detail/ui/single_step_execution_detail';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflowDetail } from '../../../entities/workflows/model/use_workflow_detail';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { TestWorkflowModal } from '../../../features/run_workflow/ui/test_workflow_modal';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { ExecutionGraph } from '../../../features/debug-graph/execution_graph';
import { TestStepModal } from '../../../features/run_workflow/ui/test_step_modal';
import { buildStepContextMockForStep } from './build_step_context_mock_for_step';

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

  const { activeTab, selectedExecutionId, selectedStepId, setActiveTab, setSelectedExecution } =
    useWorkflowUrlState();

  const { data: execution } = useWorkflowExecution(selectedExecutionId ?? null);

  const [workflowYaml, setWorkflowYaml] = useState(workflow?.yaml ?? '');
  const originalWorkflowYaml = useMemo(() => workflow?.yaml ?? '', [workflow]);
  const [hasChanges, setHasChanges] = useState(false);

  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;

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

  const { updateWorkflow, runWorkflow, runIndividualStep } = useWorkflowActions();
  const canSaveWorkflow = Boolean(application?.capabilities.workflowsManagement.updateWorkflow);
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
          // Extract message from HTTP error body and update the error message
          if (
            err &&
            typeof err === 'object' &&
            'body' in err &&
            err.body &&
            typeof err.body === 'object' &&
            'message' in err.body &&
            typeof err.body.message === 'string'
          ) {
            (err as any).message = err.body.message;
          }
          notifications?.toasts.addError(err as Error, {
            toastLifeTimeMs: 3000,
            title: 'Failed to save workflow',
          });
        },
      }
    );
  };

  const [workflowExecuteModalOpen, setWorkflowExecuteModalOpen] = useState(false);
  const [testWorkflowModalOpen, setTestWorkflowModalOpen] = useState(false);

  const [testStepId, setTestStepId] = useState<string | null>(null);
  const [stepContextMock, setStepContextMock] = useState<StepContextMockData | null>(null);
  const [testSingleStepExecutionId, setTestSingleStepExecutionId] = useState<string | null>(null);

  const handleRunClick = () => {
    let needInput: boolean | undefined = false;
    if (workflow?.definition?.triggers) {
      needInput =
        workflow.definition.triggers.some((trigger) => trigger.type === 'alert') ||
        (workflow.definition.triggers.some((trigger) => trigger.type === 'manual') &&
          workflow.definition.inputs &&
          Object.keys(workflow.definition.inputs).length > 0);
    }
    if (needInput) {
      setWorkflowExecuteModalOpen(true);
    } else {
      handleRunWorkflow({});
    }
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
  const isExecutionGraphEnabled = uiSettings?.get<boolean>(
    WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
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

  const handleStepRun = async (params: { stepId: string; actionType: string }) => {
    if (params.actionType === 'run') {
      const stepContextMockData = buildStepContextMockForStep(workflowYaml, params.stepId);

      if (!Object.keys(stepContextMockData).length) {
        submitStepRun(params.stepId, {});
        return;
      }

      setStepContextMock(stepContextMockData);
      setTestStepId(params.stepId);
    }
  };

  const submitStepRun = async (stepId: string, mock: Partial<StepContext>) => {
    const response = await runIndividualStep.mutateAsync({
      stepId,
      workflowYaml,
      stepContextMock: mock,
    });
    setTestSingleStepExecutionId(response.workflowExecutionId);
    setTestStepId(null);
    setStepContextMock(null);
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
        yaml={yamlValue}
        isLoading={isLoadingWorkflow}
        activeTab={activeTab}
        canRunWorkflow={canRunWorkflow}
        canSaveWorkflow={canSaveWorkflow}
        isValid={workflow?.valid ?? true}
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
        <EuiFlexItem css={styles.main}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem css={styles.yamlEditor}>
              <React.Suspense fallback={<EuiLoadingSpinner />}>
                <WorkflowYAMLEditor
                  workflowId={workflow?.id ?? 'unknown'}
                  filename={`${workflow?.id ?? 'unknown'}.yaml`}
                  value={yamlValue}
                  onChange={(v) => handleChange(v ?? '')}
                  lastUpdatedAt={workflow?.lastUpdatedAt}
                  hasChanges={hasChanges}
                  highlightStep={selectedStepId}
                  stepExecutions={execution?.stepExecutions}
                  readOnly={activeTab === 'executions'}
                  onStepActionClicked={handleStepRun}
                />
              </React.Suspense>
            </EuiFlexItem>
            {isVisualEditorEnabled && workflow && (
              <EuiFlexItem css={styles.visualEditor}>
                <React.Suspense fallback={<EuiLoadingSpinner />}>
                  <WorkflowVisualEditor
                    workflowYaml={yamlValue}
                    workflowExecutionId={selectedExecutionId}
                  />
                </React.Suspense>
              </EuiFlexItem>
            )}
            {isExecutionGraphEnabled && workflow && (
              <EuiFlexItem css={styles.visualEditor}>
                <React.Suspense fallback={<EuiLoadingSpinner />}>
                  <ExecutionGraph workflowYaml={yamlValue} />
                </React.Suspense>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {activeTab === 'executions' && (
          <EuiFlexItem css={styles.sidebar}>
            {!selectedExecutionId && <WorkflowExecutionList workflowId={workflow?.id ?? null} />}
            {workflow && selectedExecutionId && (
              <WorkflowExecutionDetail
                workflowExecutionId={selectedExecutionId}
                workflowYaml={yamlValue}
                onClose={() => setSelectedExecution(null)}
              />
            )}
          </EuiFlexItem>
        )}
        {workflow && testSingleStepExecutionId && activeTab !== 'executions' && (
          <EuiFlexItem css={styles.sidebar}>
            <SingleStepExecution
              stepExecutionId={testSingleStepExecutionId}
              workflowYaml={yamlValue}
              onClose={() => setTestSingleStepExecutionId(null)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {workflowExecuteModalOpen && workflow && (
        <WorkflowExecuteModal
          workflow={workflow}
          onClose={() => setWorkflowExecuteModalOpen(false)}
          onSubmit={handleRunWorkflow}
        />
      )}
      {testWorkflowModalOpen && (
        <TestWorkflowModal
          workflowYaml={workflowYaml}
          onClose={() => setTestWorkflowModalOpen(false)}
        />
      )}
      {testStepId && stepContextMock && (
        <TestStepModal
          initialStepContextMock={stepContextMock}
          onSubmit={({ stepInputs }) => submitStepRun(testStepId, stepInputs)}
          onClose={() => {
            setTestStepId(null);
            setStepContextMock(null);
          }}
        />
      )}
    </div>
  );
}

const componentStyles = {
  pageContainer: css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    overflow: 'hidden',
  }),
  container: css`
    flex: 1;
    height: 100%;
    min-height: 0;
    flex-wrap: nowrap !important;
  `,
  main: css({
    flex: 1,
    overflow: 'hidden',
  }),
  yamlEditor: css({
    flex: 1,
    overflow: 'hidden',
  }),
  visualEditor: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  sidebar: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxWidth: '300px',
      flex: 1,
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
};
