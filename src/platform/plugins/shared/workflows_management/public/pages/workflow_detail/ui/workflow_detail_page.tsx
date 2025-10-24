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
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { workflowDefaultYaml } from './workflow_default_yml';
import { WorkflowDetailEditor } from './workflow_detail_editor';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { WorkflowEditorLayout } from './workflow_detail_layout';
import { WorkflowDetailTestModal } from './workflow_detail_test_modal';
import { useLoadWorkflow } from '../../../entities/workflows/model/use_load_workflow';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { setYamlString } from '../../../widgets/workflow_yaml_editor/lib/store';
import {
  selectWorkflowName,
  selectYamlString,
} from '../../../widgets/workflow_yaml_editor/lib/store/selectors';

export function WorkflowDetailPage({ id }: { id?: string }) {
  const [loadWorkflow, { isLoading, error }] = useLoadWorkflow();
  const dispatch = useDispatch();

  useEffect(() => {
    if (id) {
      loadWorkflow({ id });
    } else {
      dispatch(setYamlString(workflowDefaultYaml));
    }
  }, [loadWorkflow, id, dispatch]);

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
    <EuiFlexGroup direction="column" gutterSize="none" css={kbnFullBodyHeightCss()}>
      <EuiFlexItem grow={false}>
        <WorkflowDetailHeader
          isLoading={isLoading}
          activeTab={activeTab}
          handleTabChange={setActiveTab}
          highlightDiff={highlightDiff}
          setHighlightDiff={setHighlightDiff}
        />
      </EuiFlexItem>
      <EuiFlexItem css={css({ overflow: 'hidden', minHeight: 0 })}>
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
            id && activeTab === 'executions' && !selectedExecutionId ? (
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
