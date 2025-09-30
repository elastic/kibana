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
import type { StepContext, WorkflowYaml } from '@kbn/workflows';
import {
  WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
  WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
} from '@kbn/workflows';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflowDetail } from '../../../entities/workflows/model/use_workflow_detail';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { ExecutionGraph } from '../../../features/debug-graph/execution_graph';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { TestStepModal } from '../../../features/run_workflow/ui/test_step_modal';
import { buildContextOverrideForStep } from './build_step_context_mock_for_step';
import { getWorkflowZodSchemaLoose } from '../../../../common/schema';

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
  const { application, uiSettings, notifications } = useKibana().services;
  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = useWorkflowDetail(id);
  useWorkflowsBreadcrumbs(workflow?.name);

  const { activeTab, selectedExecutionId, selectedStepId, setActiveTab, setSelectedExecution } =
    useWorkflowUrlState();

  const showExecutionSidebar = activeTab === 'executions' || selectedExecutionId;

  const { data: execution } = useWorkflowExecution(selectedExecutionId ?? null);

  const [workflowYaml, setWorkflowYaml] = useState(workflow?.yaml ?? '');
  const originalWorkflowYaml = useMemo(() => workflow?.yaml ?? '', [workflow]);
  const [hasChanges, setHasChanges] = useState(false);
  const [highlightDiff, setHighlightDiff] = useState(false);

  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;

  const { updateWorkflow, runWorkflow, runIndividualStep, testWorkflow } = useWorkflowActions();

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
  const [testWorkflowModalOpen, setTestWorkflowModalOpen] = useState(false);

  const definitionFromCurrentYaml: WorkflowYaml | null = useMemo(() => {
    const parsingResult = parseWorkflowYamlToJSON(workflowYaml, getWorkflowZodSchemaLoose());

    if (!parsingResult.success) {
      return null;
    }
    return parsingResult.data as WorkflowYaml;
  }, [workflowYaml]);

  const [testStepId, setTestStepId] = useState<string | null>(null);
  const [contextOverride, setcontextOverride] = useState<ContextOverrideData | null>(null);

  const handleRunClick = ({ test = false }: { test: boolean }) => {
    const def = test ? definitionFromCurrentYaml : workflow?.definition;
    let needInput: boolean | undefined = false;
    if (def?.triggers) {
      needInput =
        def.triggers.some((trigger) => trigger.type === 'alert') ||
        (def.triggers.some((trigger) => trigger.type === 'manual') &&
          def.inputs &&
          Object.keys(def.inputs).length > 0);
    }
    if (needInput) {
      if (test) {
        setTestWorkflowModalOpen(true);
      } else {
        setWorkflowExecuteModalOpen(true);
      }
    } else {
      if (test) {
        handleTestRunWorkflow({});
      } else {
        handleRunWorkflow({});
      }
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
          notifications?.toasts.addSuccess(
            i18n.translate('workflows.workflowDetailHeader.success.workflowRunStarted', {
              defaultMessage: 'Workflow run started',
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
            title: i18n.translate('workflows.workflowDetailHeader.error.workflowRunFailed', {
              defaultMessage: 'Failed to run workflow',
            }),
          });
        },
      }
    );
  };

  const handleTestRunWorkflow = (event: Record<string, any>) => {
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
    setSelectedExecution(response.workflowExecutionId);
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
    <div css={styles.pageContainer}>
      <WorkflowDetailHeader
        name={workflow?.name}
        isLoading={isLoadingWorkflow}
        activeTab={activeTab}
        canRunWorkflow={canRunWorkflow}
        canSaveWorkflow={canSaveWorkflow}
        isValid={workflow?.valid ?? true}
        isEnabled={workflow?.enabled ?? false}
        handleRunClick={() => handleRunClick({ test: false })}
        handleSave={handleSave}
        handleToggleWorkflow={handleToggleWorkflow}
        canTestWorkflow={canTestWorkflow}
        handleTestClick={() => handleRunClick({ test: true })}
        handleTabChange={(tab) => {
          setActiveTab(tab);
        }}
        hasUnsavedChanges={hasChanges}
        highlightDiff={highlightDiff}
        setHighlightDiff={setHighlightDiff}
        lastUpdatedAt={workflow?.lastUpdatedAt ?? null}
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
                  selectedExecutionId={selectedExecutionId}
                  originalValue={workflow?.yaml ?? ''}
                  onStepActionClicked={handleStepRun}
                  highlightDiff={highlightDiff}
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
        {showExecutionSidebar && (
          <EuiFlexItem css={styles.sidebar}>
            {!selectedExecutionId && <WorkflowExecutionList workflowId={workflow?.id ?? null} />}
            {workflow && selectedExecutionId && (
              <WorkflowExecutionDetail
                workflowExecutionId={selectedExecutionId}
                workflowYaml={yamlValue}
                showBackButton={activeTab === 'executions'}
                onClose={() => setSelectedExecution(null)}
              />
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {workflowExecuteModalOpen && workflow && (
        <WorkflowExecuteModal
          definition={workflow.definition}
          onClose={() => setWorkflowExecuteModalOpen(false)}
          onSubmit={handleRunWorkflow}
        />
      )}
      {testWorkflowModalOpen && definitionFromCurrentYaml && (
        <WorkflowExecuteModal
          definition={definitionFromCurrentYaml}
          onClose={() => setTestWorkflowModalOpen(false)}
          onSubmit={handleTestRunWorkflow}
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
