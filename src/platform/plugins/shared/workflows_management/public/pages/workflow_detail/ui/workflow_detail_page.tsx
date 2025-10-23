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
import type { WorkflowDetailDto, WorkflowYaml } from '@kbn/workflows';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { WorkflowEditorLayout } from './workflow_detail_layout';
import { WorkflowEditor } from './workflow_editor';
import { useWorkflowActions as useWorkflowActionsHook } from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflowDetail } from '../../../entities/workflows/model/use_workflow_detail';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { selectWorkflowDefinition } from '../../../widgets/workflow_yaml_editor/lib/store/selectors';

const workflowTemplateYaml = `name: New workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: first-step
    type: console
    with:
      message: First step executed
`;

const useCreateMode = (setHasChanges: (value: boolean) => void, id?: string) => {
  const isCreateMode = !id;
  const { application, notifications } = useKibana().services;
  const { createWorkflow } = useWorkflowActionsHook();

  const handleCreateSave = useCallback(
    (workflowYaml: string) => {
      createWorkflow.mutate(
        { yaml: workflowYaml },
        {
          onSuccess: (data) => {
            // Reset changes immediately after successful creation to prevent confirmation dialog
            setHasChanges(false);
            notifications?.toasts.addSuccess(
              i18n.translate('workflows.create.success.workflowCreated', {
                defaultMessage: 'Workflow created successfully',
              }),
              { toastLifeTimeMs: 3000 }
            );
            if (application) {
              application.navigateToUrl(
                application.getUrlForApp('workflows', { path: `/${data.id}` })
              );
            }
          },
          onError: (err) => {
            if (err.body?.message) {
              err.message = err.body.message;
            }
            notifications?.toasts.addError(err, {
              toastLifeTimeMs: 3000,
              title: i18n.translate('workflows.create.error.workflowCreationFailed', {
                defaultMessage: 'Error creating workflow',
              }),
            });
          },
        }
      );
    },
    [createWorkflow, notifications?.toasts, application, setHasChanges]
  );

  return { isCreateMode, handleCreateSave };
};

const useWorkflowActions = (
  id: string | null | undefined,
  workflowYaml: string,
  workflow: WorkflowDetailDto | undefined,
  setWorkflowExecuteModalOpen: (open: boolean) => void
) => {
  const { notifications } = useKibana().services;
  const { updateWorkflow, testWorkflow } = useWorkflowActionsHook();
  const { setSelectedExecution } = useWorkflowUrlState();

  const handleUpdateSave = useCallback(
    (onSuccess?: () => void) => {
      if (!id) {
        return;
      }
      updateWorkflow.mutate(
        { id, workflow: { yaml: workflowYaml } },
        {
          ...(onSuccess && { onSuccess }),
          onError: (err) => {
            if (err.body?.message) {
              err.message = err.body.message;
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
              err.message = err.body.message;
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

  const handleToggleWorkflow = useCallback(() => {
    if (!id) {
      return;
    }
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

  return { handleUpdateSave, handleRunWorkflow, handleToggleWorkflow };
};

const useWorkflowState = (isCreateMode: boolean, workflow: WorkflowDetailDto | undefined) => {
  const [workflowYaml, setWorkflowYaml] = useState(
    isCreateMode ? workflowTemplateYaml : workflow?.yaml ?? ''
  );
  const originalWorkflowYaml = useMemo(
    () => (isCreateMode ? workflowTemplateYaml : workflow?.yaml ?? ''),
    [workflow, isCreateMode]
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [highlightDiff, setHighlightDiff] = useState(false);

  useEffect(() => {
    if (!isCreateMode) {
      setWorkflowYaml(workflow?.yaml ?? '');
      setHasChanges(false);
    }
  }, [workflow, isCreateMode]);

  const handleChange = useCallback(
    (wfString: string = '') => {
      setWorkflowYaml(wfString);
      setHasChanges(originalWorkflowYaml !== wfString);
    },
    [originalWorkflowYaml]
  );

  return {
    workflowYaml,
    hasChanges,
    highlightDiff,
    setHighlightDiff,
    handleChange,
    setHasChanges,
  };
};

export function WorkflowDetailPage({ id }: { id?: string }) {
  const { application } = useKibana().services;
  const isCreateMode = !id;
  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = useWorkflowDetail(id);

  useWorkflowsBreadcrumbs(isCreateMode ? 'Create workflow' : workflow?.name);

  const { activeTab, selectedExecutionId, selectedStepId, setActiveTab, setSelectedExecution } =
    useWorkflowUrlState();

  const { data: execution } = useWorkflowExecution(selectedExecutionId ?? null);
  const { workflowYaml, hasChanges, highlightDiff, setHighlightDiff, handleChange, setHasChanges } =
    useWorkflowState(isCreateMode, workflow);

  const { handleCreateSave } = useCreateMode(setHasChanges, id);

  const [workflowExecuteModalOpen, setWorkflowExecuteModalOpen] = useState(false);
  const closeModal = useCallback(() => {
    setWorkflowExecuteModalOpen(false);
  }, []);

  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;
  const definition = useSelector(selectWorkflowDefinition) ?? null;

  // Parse YAML to determine if workflow is enabled in create mode
  const definitionFromCurrentYaml: WorkflowYaml | null = useMemo(() => {
    try {
      return workflowYaml ? JSON.parse(workflowYaml) : null;
    } catch {
      return null;
    }
  }, [workflowYaml]);

  const isWorkflowEnabled = useMemo(() => {
    if (isCreateMode) {
      return definitionFromCurrentYaml?.enabled ?? false;
    }
    return workflow?.enabled ?? false;
  }, [isCreateMode, definitionFromCurrentYaml?.enabled, workflow?.enabled]);

  const { handleUpdateSave, handleRunWorkflow, handleToggleWorkflow } = useWorkflowActions(
    id,
    workflowYaml,
    workflow,
    setWorkflowExecuteModalOpen
  );

  const canSaveWorkflow = Boolean(
    isCreateMode
      ? application?.capabilities.workflowsManagement.createWorkflow
      : application?.capabilities.workflowsManagement.updateWorkflow
  );
  const canRunWorkflow = Boolean(application?.capabilities.workflowsManagement.executeWorkflow);

  const handleSave = useCallback(
    (onSuccess?: () => void) => {
      if (isCreateMode) {
        handleCreateSave(workflowYaml);
      } else {
        handleUpdateSave(onSuccess);
      }
    },
    [isCreateMode, workflowYaml, handleCreateSave, handleUpdateSave]
  );

  const handleRun = useCallback(() => {
    setWorkflowExecuteModalOpen(true);
  }, [setWorkflowExecuteModalOpen]);

  const handleSaveAndRun = useCallback(() => {
    handleSave(() => handleRun());
  }, [handleRun, handleSave]);

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
          isCreateMode={isCreateMode}
          name={isCreateMode ? 'New workflow' : workflow?.name}
          isLoading={isCreateMode ? false : isLoadingWorkflow}
          activeTab={activeTab}
          canRunWorkflow={canRunWorkflow}
          canSaveWorkflow={canSaveWorkflow}
          isEnabled={isWorkflowEnabled}
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
