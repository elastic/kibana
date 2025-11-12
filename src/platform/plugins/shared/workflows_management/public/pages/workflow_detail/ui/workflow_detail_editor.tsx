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
import type { StepContext } from '@kbn/workflows';
import {
  WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
  WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
} from '@kbn/workflows';
import { useContextOverrideData } from './use_context_override_data';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { selectYamlString } from '../../../entities/workflows/store/workflow_detail/selectors';
import { ExecutionGraph } from '../../../features/debug-graph/execution_graph';
import { TestStepModal } from '../../../features/run_workflow/ui/test_step_modal';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';

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
  // Styles
  const styles = useMemoCss(componentStyles);

  // Redux selectors, only used in current workflow tab, not in executions tab
  const workflowYaml = useSelector(selectYamlString) ?? '';

  // Hooks
  const { uiSettings } = useKibana().services;
  const { setSelectedExecution } = useWorkflowUrlState();
  const getContextOverrideData = useContextOverrideData();
  const { runIndividualStep } = useWorkflowActions();

  // Local state
  const [testStepId, setTestStepId] = useState<string | null>(null);
  const [contextOverride, setContextOverride] = useState<ContextOverrideData | null>(null);

  // UI settings
  const isVisualEditorEnabled = uiSettings?.get<boolean>(
    WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
    false
  );
  const isExecutionGraphEnabled = uiSettings?.get<boolean>(
    WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
    false
  );

  // Modal handlers
  const closeModal = useCallback(() => {
    setTestStepId(null);
    setContextOverride(null);
  }, []);

  // Step run handlers
  const submitStepRun = useCallback(
    async (stepId: string, mock: Partial<StepContext>) => {
      const response = await runIndividualStep.mutateAsync({
        stepId,
        workflowYaml,
        contextOverride: mock,
      });
      setSelectedExecution(response.workflowExecutionId);
      closeModal();
    },
    [runIndividualStep, workflowYaml, setSelectedExecution, closeModal]
  );

  const handleStepRun = useCallback(
    async (params: { stepId: string; actionType: string }) => {
      if (params.actionType !== 'run') {
        return;
      }

      const contextOverrideData = getContextOverrideData(params.stepId);
      if (!contextOverrideData) {
        return;
      }

      // If step doesn't reference any other data/steps, submit immediately
      if (!Object.keys(contextOverrideData.stepContext).length) {
        await submitStepRun(params.stepId, {});
        return;
      }

      // Otherwise, show modal for user input
      setContextOverride(contextOverrideData);
      setTestStepId(params.stepId);
    },
    [getContextOverrideData, submitStepRun]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
        <EuiFlexItem css={styles.yamlEditor}>
          <React.Suspense fallback={<EuiLoadingSpinner />}>
            <WorkflowYAMLEditor highlightDiff={highlightDiff} onStepRun={handleStepRun} />
          </React.Suspense>
        </EuiFlexItem>
        {isVisualEditorEnabled && (
          <EuiFlexItem css={styles.visualEditor}>
            <React.Suspense fallback={<EuiLoadingSpinner />}>
              <WorkflowVisualEditor />
            </React.Suspense>
          </EuiFlexItem>
        )}
        {isExecutionGraphEnabled && (
          <EuiFlexItem css={styles.visualEditor}>
            <React.Suspense fallback={<EuiLoadingSpinner />}>
              <ExecutionGraph />
            </React.Suspense>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {testStepId && contextOverride && (
        <TestStepModal
          initialcontextOverride={contextOverride}
          onSubmit={({ stepInputs }) => submitStepRun(testStepId, stepInputs)}
          onClose={closeModal}
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
