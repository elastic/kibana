/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { StepContext, WorkflowExecutionDto } from '@kbn/workflows';
import {
  WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
  WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
} from '@kbn/workflows';
import { buildContextOverrideForStep } from './build_step_context_mock_for_step';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { ExecutionGraph } from '../../../features/debug-graph/execution_graph';
import { TestStepModal } from '../../../features/run_workflow/ui/test_step_modal';
import type { WorkflowUrlStateTabType } from '../../../hooks/use_workflow_url_state';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import {
  selectWorkflowDefinition,
  selectYamlString,
} from '../../../widgets/workflow_yaml_editor/lib/store/selectors';

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
  activeTab: WorkflowUrlStateTabType;
  selectedExecutionId: string | undefined;
  selectedStepId: string | undefined;
  execution: WorkflowExecutionDto | undefined;
  highlightDiff?: boolean;
  setSelectedExecution: (executionId: string | null) => void;
}

export const WorkflowDetailEditor = React.memo<WorkflowDetailEditorProps>(
  ({
    activeTab,
    selectedExecutionId,
    selectedStepId,
    execution,
    highlightDiff,
    setSelectedExecution,
  }) => {
    const styles = useMemoCss(componentStyles);
    const { uiSettings } = useKibana().services;
    const workflowYaml = useSelector(selectYamlString) ?? '';
    const workflowDefinition = useSelector(selectWorkflowDefinition);

    const { runIndividualStep } = useWorkflowActions();

    const [testStepId, setTestStepId] = useState<string | null>(null);
    const [contextOverride, setContextOverride] = useState<ContextOverrideData | null>(null);

    const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;

    const submitStepRun = useCallback(
      async (stepId: string, mock: Partial<StepContext>) => {
        const response = await runIndividualStep.mutateAsync({
          stepId,
          workflowYaml,
          contextOverride: mock,
        });
        setSelectedExecution(response.workflowExecutionId);
        setTestStepId(null);
        setContextOverride(null);
      },
      [runIndividualStep, workflowYaml, setSelectedExecution, setTestStepId, setContextOverride]
    );

    const handleStepRun = useCallback(
      async (params: { stepId: string; actionType: string }) => {
        if (params.actionType === 'run' && workflowDefinition) {
          const contextOverrideData = buildContextOverrideForStep(
            workflowDefinition,
            params.stepId
          );

          if (!Object.keys(contextOverrideData.stepContext).length) {
            submitStepRun(params.stepId, {});
            return;
          }

          setContextOverride(contextOverrideData);
          setTestStepId(params.stepId);
        }
      },
      [workflowDefinition, submitStepRun]
    );

    const isVisualEditorEnabled = uiSettings?.get<boolean>(
      WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
      false
    );
    const isExecutionGraphEnabled = uiSettings?.get<boolean>(
      WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
      false
    );

    return (
      <>
        <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
          <EuiFlexItem css={styles.yamlEditor}>
            <React.Suspense fallback={<EuiLoadingSpinner />}>
              <WorkflowYAMLEditor
                highlightStep={selectedStepId}
                stepExecutions={execution?.stepExecutions}
                readOnly={activeTab === 'executions'}
                highlightDiff={highlightDiff}
                selectedExecutionId={selectedExecutionId}
                onStepActionClicked={handleStepRun}
              />
            </React.Suspense>
          </EuiFlexItem>
          {isVisualEditorEnabled && (
            <EuiFlexItem css={styles.visualEditor}>
              <React.Suspense fallback={<EuiLoadingSpinner />}>
                <WorkflowVisualEditor
                  workflowYaml={yamlValue}
                  workflowExecutionId={selectedExecutionId}
                />
              </React.Suspense>
            </EuiFlexItem>
          )}
          {isExecutionGraphEnabled && (
            <EuiFlexItem css={styles.visualEditor}>
              <React.Suspense fallback={<EuiLoadingSpinner />}>
                <ExecutionGraph workflowYaml={yamlValue} />
              </React.Suspense>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {testStepId && contextOverride && (
          <TestStepModal
            initialcontextOverride={contextOverride}
            onSubmit={({ stepInputs }) => submitStepRun(testStepId, stepInputs)}
            onClose={() => {
              setTestStepId(null);
              setContextOverride(null);
            }}
          />
        )}
      </>
    );
  }
);
WorkflowDetailEditor.displayName = 'WorkflowDetailEditor';

const componentStyles = {
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
};
