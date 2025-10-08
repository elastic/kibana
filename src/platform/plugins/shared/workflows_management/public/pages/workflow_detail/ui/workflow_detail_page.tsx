/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowYaml } from '@kbn/workflows';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflowDetail } from '../../../entities/workflows/model/use_workflow_detail';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { WorkflowEditor } from './workflow_editor';
import { WorkflowEditorLayout } from './workflow_detail_layout';
import { getWorkflowZodSchemaLoose } from '../../../../common/schema';
import { WorkflowEditorStoreProvider } from '../../../widgets/workflow_yaml_editor/lib/store';

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
  const originalWorkflowYaml = useMemo(() => workflow?.yaml ?? '', [workflow]);
  const [hasChanges, setHasChanges] = useState(false);
  const [highlightDiff, setHighlightDiff] = useState(false);

  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;

  const { updateWorkflow, testWorkflow } = useWorkflowActions();

  const canSaveWorkflow = Boolean(application?.capabilities.workflowsManagement.updateWorkflow);
  const canRunWorkflow = Boolean(application?.capabilities.workflowsManagement.executeWorkflow);
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

  const definitionFromCurrentYaml: WorkflowYaml | null = useMemo(() => {
    const parsingResult = parseWorkflowYamlToJSON(workflowYaml, getWorkflowZodSchemaLoose());

    if (!parsingResult.success) {
      return null;
    }
    return parsingResult.data as WorkflowYaml;
  }, [workflowYaml]);

  const handleRunClick = () => {
    setWorkflowExecuteModalOpen(true);
  };

  const handleRunWorkflow = (event: Record<string, any>) => {
    testWorkflow.mutate(
      { workflowYaml, inputs: event },
      {
        onSuccess: ({ workflowExecutionId }) => {
          notifications?.toasts.addSuccess(
            i18n.translate('workflows.workflowDetailHeader.success.workflowTestRunStarted', {
              defaultMessage: 'Workflow test run started',
            }),
            {
              toastLifeTimeMs: 3000,
            }
          );
          setSelectedExecution(workflowExecutionId);
        },
        onError: (err: unknown) => {
          notifications?.toasts.addError(err as Error, {
            toastLifeTimeMs: 3000,
            title: i18n.translate('workflows.workflowDetailHeader.error.workflowTestRunFailed', {
              defaultMessage: 'Failed to test workflow',
            }),
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

  const handleChange = (wfString: string = '') => {
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
    <WorkflowEditorStoreProvider>
      <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
        <EuiFlexItem style={{ overflow: 'hidden' }}>
          <WorkflowDetailHeader
            name={workflow?.name}
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
            handleTabChange={setActiveTab}
            hasUnsavedChanges={hasChanges}
            highlightDiff={highlightDiff}
            setHighlightDiff={setHighlightDiff}
            lastUpdatedAt={workflow?.lastUpdatedAt ?? null}
          />
          <WorkflowEditorLayout
            editor={
              <WorkflowEditor
                workflow={workflow}
                workflowYaml={yamlValue}
                onWorkflowYamlChange={handleChange}
                hasChanges={hasChanges}
                execution={execution}
                activeTab={activeTab}
                selectedExecutionId={selectedExecutionId}
                selectedStepId={selectedStepId}
                highlightDiff={highlightDiff}
                setSelectedExecution={setSelectedExecution}
              />
            }
            executionList={
              activeTab === 'executions' && workflow && !selectedExecutionId ? (
                <WorkflowExecutionList workflowId={workflow?.id ?? null} />
              ) : null
            }
            executionDetail={
              workflow && selectedExecutionId ? (
                <WorkflowExecutionDetail
                  workflowExecutionId={selectedExecutionId}
                  workflowYaml={yamlValue}
                  showBackButton={activeTab === 'executions'}
                  onClose={() => setSelectedExecution(null)}
                />
              ) : null
            }
          />
        </EuiFlexItem>

        {workflowExecuteModalOpen && workflow && (
          <WorkflowExecuteModal
            definition={definitionFromCurrentYaml}
            onClose={() => setWorkflowExecuteModalOpen(false)}
            onSubmit={handleRunWorkflow}
          />
        )}
      </EuiFlexGroup>
    </WorkflowEditorStoreProvider>
  );
}
