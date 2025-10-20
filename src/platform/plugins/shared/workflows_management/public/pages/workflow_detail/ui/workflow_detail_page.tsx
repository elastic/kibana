/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { WorkflowDetailEditor } from './workflow_detail_editor';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { WorkflowEditorLayout } from './workflow_detail_layout';
import { WorkflowDetailTestModal } from './workflow_detail_test_modal';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { useLoadWorkflow } from '../../../widgets/workflow_yaml_editor/lib/store/hooks/use_load_workflow';
import {
  selectWorkflowName,
  selectYamlString,
} from '../../../widgets/workflow_yaml_editor/lib/store/selectors';

export function WorkflowDetailPage({ id }: { id: string }) {
  const { loadWorkflow, error, isLoading: isLoadingWorkflow } = useLoadWorkflow();

  useEffect(() => {
    loadWorkflow(id);
  }, [loadWorkflow, id]);

  const workflowName = useSelector(selectWorkflowName);
  useWorkflowsBreadcrumbs(workflowName);

  const { activeTab, selectedExecutionId, selectedStepId, setActiveTab, setSelectedExecution } =
    useWorkflowUrlState();

  const { data: execution } = useWorkflowExecution(selectedExecutionId ?? null);
  // TODO: manage it in a workflow state context
  const [highlightDiff, setHighlightDiff] = useState(false);

  const workflowYaml = useSelector(selectYamlString);
  const yamlValue = selectedExecutionId && execution ? execution.yaml : workflowYaml ?? '';

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowDetail.error.title"
              defaultMessage="Unable to load workflow"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="workflows.workflowDetail.error.body"
              defaultMessage="There was an error loading the workflow. {error}"
              values={{ error }}
            />
          </p>
        }
      />
    );
  }

  return (
    <EuiFlexGroup gutterSize="none" style={{ height: '100%' }}>
      <EuiFlexItem style={{ overflow: 'hidden' }}>
        <WorkflowDetailHeader
          isLoading={isLoadingWorkflow}
          activeTab={activeTab}
          handleTabChange={setActiveTab}
          highlightDiff={highlightDiff}
          setHighlightDiff={setHighlightDiff}
        />
        <WorkflowEditorLayout
          editor={
            <WorkflowDetailEditor
              execution={execution}
              activeTab={activeTab}
              selectedExecutionId={selectedExecutionId}
              selectedStepId={selectedStepId}
              highlightDiff={highlightDiff}
              setSelectedExecution={setSelectedExecution}
            />
          }
          executionList={
            activeTab === 'executions' && !selectedExecutionId ? (
              <WorkflowExecutionList workflowId={id} />
            ) : null
          }
          executionDetail={
            selectedExecutionId ? (
              <WorkflowExecutionDetail
                workflowExecutionId={selectedExecutionId}
                workflowYaml={yamlValue}
                showBackButton={activeTab === 'executions'}
                onClose={() => setSelectedExecution(null)}
              />
            ) : null
          }
        />
        <WorkflowDetailTestModal />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
