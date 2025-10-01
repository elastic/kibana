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
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';
import {
  WORKFLOWS_UI_EXECUTION_GRAPH_SETTING_ID,
  WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
} from '@kbn/workflows';
import React, { useEffect, useMemo, useState } from 'react';
import { ExecutionGraph } from '../../../features/debug-graph/execution_graph';
import type { WorkflowUrlStateTabType } from '../../../hooks/use_workflow_url_state';

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
  activeTab: WorkflowUrlStateTabType;
  selectedExecutionId: string | undefined;
  selectedStepId: string | undefined;
  workflow: WorkflowDetailDto | undefined;
  execution: WorkflowExecutionDto | undefined;
  highlightDiff?: boolean;
  handleStepRun: (params: { stepId: string; actionType: string }) => Promise<void>;
}

export function WorkflowEditor({
  activeTab,
  selectedExecutionId,
  selectedStepId,
  workflow,
  execution,
  highlightDiff,
  handleStepRun,
}: WorkflowEditorProps) {
  const styles = useMemoCss(componentStyles);
  const { uiSettings } = useKibana().services;

  const [workflowYaml, setWorkflowYaml] = useState(workflow?.yaml ?? '');
  const originalWorkflowYaml = useMemo(() => workflow?.yaml ?? '', [workflow]);
  const [hasChanges, setHasChanges] = useState(false);

  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml;

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

  return (
    <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
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
