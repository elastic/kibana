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
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { StepContext } from '@kbn/workflows';
import {
  WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
  WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
} from '@kbn/workflows';
import { buildContextOverrideForStep } from './build_step_context_mock_for_step';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { ExecutionGraph } from '../../../features/debug-graph/execution_graph';
import { TestStepModal } from '../../../features/run_workflow/ui/test_step_modal';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import {
  selectWorkflowDefinition,
  selectWorkflowGraph,
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
  highlightDiff?: boolean;
}

export const WorkflowDetailEditor = React.memo<WorkflowDetailEditorProps>(({ highlightDiff }) => {
  const styles = useMemoCss(componentStyles);
  const { uiSettings } = useKibana().services;
  const workflowYaml = useSelector(selectYamlString) ?? '';
  const workflowDefinition = useSelector(selectWorkflowDefinition);
  const workflowGraph = useSelector(selectWorkflowGraph);

  const { activeTab, selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();

  const { data: execution } = useWorkflowExecution(selectedExecutionId ?? null);

  const { runIndividualStep } = useWorkflowActions();

  const [testStepId, setTestStepId] = useState<string | null>(null);
  const [contextOverride, setContextOverride] = useState<ContextOverrideData | null>(null);

  const overrideYamlValue = useMemo<string | undefined>(() => {
    if (activeTab === 'executions' && execution) {
      return execution.yaml;
    }
  }, [activeTab, execution]);

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
      if (params.actionType === 'run' && workflowGraph && workflowDefinition) {
        const contextOverrideData = buildContextOverrideForStep(
          workflowGraph,
          workflowDefinition,
          params.stepId
        );

        // In case when a step does not reference any other data/steps
        // we submit step run without additional actions from the user
        if (!Object.keys(contextOverrideData.stepContext).length) {
          submitStepRun(params.stepId, {});
          return;
        }

        setContextOverride(contextOverrideData);
        setTestStepId(params.stepId);
      }
    },
    [workflowGraph, workflowDefinition, submitStepRun]
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
              stepExecutions={execution?.stepExecutions}
              workflowYaml={overrideYamlValue ?? workflowYaml}
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
                workflowYaml={overrideYamlValue ?? workflowYaml}
                workflowExecutionId={selectedExecutionId}
              />
            </React.Suspense>
          </EuiFlexItem>
        )}
        {isExecutionGraphEnabled && (
          <EuiFlexItem css={styles.visualEditor}>
            <React.Suspense fallback={<EuiLoadingSpinner />}>
              <ExecutionGraph workflowYaml={overrideYamlValue ?? workflowYaml} />
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
});
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
