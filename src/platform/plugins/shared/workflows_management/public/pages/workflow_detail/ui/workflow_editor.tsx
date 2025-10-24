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
import React, { useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { StepContext, WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';
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

interface WorkflowEditorProps {
  workflowYaml: string;
  onWorkflowYamlChange: (yaml: string | undefined) => void;
  hasChanges: boolean;
  handleSave: () => void;
  handleRun: () => void;
  handleSaveAndRun: () => void;
  activeTab: WorkflowUrlStateTabType;
  selectedExecutionId: string | undefined;
  selectedStepId: string | undefined;
  workflow: WorkflowDetailDto | undefined;
  execution: WorkflowExecutionDto | undefined;
  highlightDiff?: boolean;
  setSelectedExecution: (executionId: string | null) => void;
}

export function WorkflowEditor({
  workflowYaml,
  onWorkflowYamlChange,
  handleSave,
  handleRun,
  handleSaveAndRun,
  hasChanges,
  activeTab,
  selectedExecutionId,
  selectedStepId,
  workflow,
  execution,
  highlightDiff,
  setSelectedExecution,
}: WorkflowEditorProps) {
  const styles = useMemoCss(componentStyles);
  const { uiSettings } = useKibana().services;

  const { runIndividualStep } = useWorkflowActions();

  const [testStepId, setTestStepId] = useState<string | null>(null);
  const [contextOverride, setContextOverride] = useState<ContextOverrideData | null>(null);

  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;

  const handleStepRun = async (params: { stepId: string; actionType: string }) => {
    if (params.actionType === 'run') {
      const contextOverrideData = buildContextOverrideForStep(workflowYaml, params.stepId);

      if (!Object.keys(contextOverrideData.stepContext).length) {
        submitStepRun(params.stepId, {});
        return;
      }

      setContextOverride(contextOverrideData);
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
    setContextOverride(null);
  };

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
              workflowId={workflow?.id ?? 'unknown'}
              filename={`${workflow?.id ?? 'unknown'}.yaml`}
              value={yamlValue}
              onChange={onWorkflowYamlChange}
              onSave={handleSave}
              onRun={handleRun}
              onSaveAndRun={handleSaveAndRun}
              lastUpdatedAt={workflow?.lastUpdatedAt}
              hasChanges={hasChanges}
              highlightStep={selectedStepId}
              stepExecutions={execution?.stepExecutions}
              readOnly={activeTab === 'executions'}
              highlightDiff={highlightDiff}
              selectedExecutionId={selectedExecutionId}
              originalValue={workflow?.yaml ?? ''}
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
