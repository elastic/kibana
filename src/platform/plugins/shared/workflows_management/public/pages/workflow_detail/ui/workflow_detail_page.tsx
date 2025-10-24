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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { WorkflowEditorLayout } from './workflow_detail_layout';
import { WorkflowEditor } from './workflow_editor';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflowDetail } from '../../../entities/workflows/model/use_workflow_detail';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { selectWorkflowDefinition } from '../../../widgets/workflow_yaml_editor/lib/store/selectors';

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

  const [workflowExecuteModalOpen, setWorkflowExecuteModalOpen] = useState(false);
  const closeModal = useCallback(() => {
    setWorkflowExecuteModalOpen(false);
  }, []);

  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;

  const { updateWorkflow, testWorkflow } = useWorkflowActions();

  const canSaveWorkflow = Boolean(application?.capabilities.workflowsManagement.updateWorkflow);
  const canRunWorkflow = Boolean(application?.capabilities.workflowsManagement.executeWorkflow);

  const handleSave = useCallback(
    (onSuccess?: () => void) => {
      updateWorkflow.mutate(
        { id, workflow: { yaml: workflowYaml } },
        {
          ...(onSuccess && { onSuccess }),
          onError: (err) => {
            if (err.body?.message) {
              err.message = err.body.message; // Extract message from HTTP error body and update the error message
            }
            notifications?.toasts.addError(err, {
              toastLifeTimeMs: 3000,
              title: i18n.translate('workflows.detail.error.workflowSaveFailed', {
                defaultMessage: 'Failed to save workflow',
              }),
            });
          },
        }
      );
    },
    [id, workflowYaml, updateWorkflow, notifications?.toasts]
  );

  const definition = useSelector(selectWorkflowDefinition) ?? null;

  const handleRun = useCallback(() => {
    setWorkflowExecuteModalOpen(true);
  }, [setWorkflowExecuteModalOpen]);

  const handleRunWorkflow = useCallback(
    (event: Record<string, unknown>) => {
      testWorkflow.mutate(
        { workflowYaml, inputs: event },
        {
          onSuccess: ({ workflowExecutionId }) => {
            notifications?.toasts.addSuccess(
              i18n.translate('workflows.workflowDetailHeader.success.workflowTestRunStarted', {
                defaultMessage: 'Workflow test run started',
              }),
              { toastLifeTimeMs: 3000 }
            );
            setSelectedExecution(workflowExecutionId);
          },
          onError: (err) => {
            if (err.body?.message) {
              err.message = err.body.message; // Extract message from HTTP error body and update the error message
            }
            notifications?.toasts.addError(err as Error, {
              toastLifeTimeMs: 3000,
              title: i18n.translate('workflows.workflowDetailHeader.error.workflowTestRunFailed', {
                defaultMessage: 'Failed to test workflow',
              }),
            });
          },
        }
      );
    },
    [notifications?.toasts, setSelectedExecution, testWorkflow, workflowYaml]
  );

  const handleSaveAndRun = useCallback(() => {
    handleSave(() => handleRun());
  }, [handleRun, handleSave]);

  const handleToggleWorkflow = useCallback(() => {
    if (!workflow) {
      notifications?.toasts.addError(new Error('Workflow is not loaded'), {
        toastLifeTimeMs: 3000,
        title: i18n.translate('workflows.detail.error.workflowNotLoaded', {
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

  const handleChange = useCallback(
    (wfString: string = '') => {
      setWorkflowYaml(wfString);
      setHasChanges(originalWorkflowYaml !== wfString);
    },
    [originalWorkflowYaml]
  );

  if (workflowError) {
    const error = workflowError as Error;
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{'Unable to load workflow'}</h2>}
        body={
          <p>
            {'There was an error loading the workflow. '}
            {error.message}
          </p>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={kbnFullBodyHeightCss()}>
      <EuiFlexItem grow={false}>
        <WorkflowDetailHeader
          name={workflow?.name}
          isLoading={isLoadingWorkflow}
          activeTab={activeTab}
          canRunWorkflow={canRunWorkflow}
          canSaveWorkflow={canSaveWorkflow}
          isEnabled={workflow?.enabled ?? false}
          handleRunClick={handleRun}
          handleSave={handleSave}
          handleToggleWorkflow={handleToggleWorkflow}
          handleTabChange={setActiveTab}
          hasUnsavedChanges={hasChanges}
          highlightDiff={highlightDiff}
          setHighlightDiff={setHighlightDiff}
          lastUpdatedAt={workflow?.lastUpdatedAt ?? null}
        />
      </EuiFlexItem>
      <EuiFlexItem css={css({ overflow: 'hidden', minHeight: 0 })}>
        <WorkflowEditorLayout
          editor={
            <WorkflowEditor
              workflow={workflow}
              workflowYaml={yamlValue}
              onWorkflowYamlChange={handleChange}
              handleSave={handleSave}
              handleRun={handleRun}
              handleSaveAndRun={handleSaveAndRun}
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

      {workflowExecuteModalOpen && (
        <WorkflowExecuteModal
          definition={definition}
          onClose={closeModal}
          onSubmit={handleRunWorkflow}
        />
      )}
    </EuiFlexGroup>
  );
}
