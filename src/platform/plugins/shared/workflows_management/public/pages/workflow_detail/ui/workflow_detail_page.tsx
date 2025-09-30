/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { StepContext } from '@kbn/workflows';
import React, { useCallback, useEffect, useState } from 'react';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
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
import { TestStepModal } from '../../../features/run_workflow/ui/test_step_modal';
import { buildContextOverrideForStep } from './build_step_context_mock_for_step';
import { WorkflowEditor } from './workflow_editor';
import { WorkflowEditorLayout } from './workflow_detail_layout';

export function WorkflowDetailPage({ id }: { id: string }) {
  const { application, notifications } = useKibana().services;
  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = useWorkflowDetail(id);
  useWorkflowsBreadcrumbs(workflow?.name);

  const { activeTab, selectedExecutionId, selectedStepId, setActiveTab, setSelectedExecution } =
    useWorkflowUrlState();

  const { data: execution } = useWorkflowExecution(selectedExecutionId ?? null);

  const [workflowYaml, setWorkflowYaml] = useState(workflow?.yaml ?? '');
  const [hasChanges, setHasChanges] = useState(false);

  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;

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
  const [contextOverride, setcontextOverride] = useState<ContextOverrideData | null>(null);
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

  useEffect(() => {
    setWorkflowYaml(workflow?.yaml ?? '');
    setHasChanges(false);
  }, [workflow]);

  const handleStepRun = async (params: { stepId: string; actionType: string }) => {
    if (params.actionType === 'run') {
      const contextOverrideData = buildContextOverrideForStep(workflowYaml, params.stepId);

      if (!Object.keys(contextOverrideData.stepContext).length) {
        submitStepRun(params.stepId, {});
        return;
      }

      setcontextOverride(contextOverrideData);
      setTestStepId(params.stepId);
    }
  };

  const submitStepRun = async (stepId: string, mock: Partial<StepContext>) => {
    const response = await runIndividualStep.mutateAsync({
      stepId,
      workflowYaml,
      contextOverride: mock,
    });
    setTestSingleStepExecutionId(response.workflowExecutionId);
    setTestStepId(null);
    setcontextOverride(null);
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
    <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
      <EuiFlexItem style={{ overflow: 'hidden' }}>
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
          hasUnsavedChanges={hasChanges}
        />
        <WorkflowEditorLayout
          editor={
            <WorkflowEditor
              workflow={workflow}
              execution={execution}
              activeTab={activeTab}
              selectedExecutionId={selectedExecutionId}
              selectedStepId={selectedStepId}
              handleStepRun={handleStepRun}
            />
          }
          executionList={
            activeTab === 'executions' && workflow && !selectedExecutionId ? (
              <WorkflowExecutionList workflowId={workflow?.id ?? null} />
            ) : null
          }
          executionDetail={
            activeTab === 'executions' && workflow && selectedExecutionId ? (
              <WorkflowExecutionDetail
                workflowExecutionId={selectedExecutionId}
                workflowYaml={yamlValue}
                onClose={() => setSelectedExecution(null)}
              />
            ) : null
          }
          singleStepExecutionDetail={
            activeTab === 'workflow' && workflow && testSingleStepExecutionId ? (
              <SingleStepExecution
                stepExecutionId={testSingleStepExecutionId!}
                workflowYaml={yamlValue}
                onClose={() => setTestSingleStepExecutionId(null)}
              />
            ) : null
          }
        />
      </EuiFlexItem>

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
      {testStepId && contextOverride && (
        <TestStepModal
          initialcontextOverride={contextOverride}
          onSubmit={({ stepInputs }) => submitStepRun(testStepId, stepInputs)}
          onClose={() => {
            setTestStepId(null);
            setcontextOverride(null);
          }}
        />
      )}
    </EuiFlexGroup>
  );
}
