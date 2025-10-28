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
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { workflowDefaultYaml } from './workflow_default_yml';
import { WorkflowDetailEditor } from './workflow_detail_editor';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { WorkflowEditorLayout } from './workflow_detail_layout';
import { WorkflowDetailTestModal } from './workflow_detail_test_modal';
import { WorkflowExecutionDetail } from '../../../features/workflow_execution_detail';
import { WorkflowExecutionList } from '../../../features/workflow_execution_list/ui/workflow_execution_list_stateful';
import { useWorkflowsBreadcrumbs } from '../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { setYamlString } from '../../../widgets/workflow_yaml_editor/lib/store';
import {
  useAsyncThunk,
  useAsyncThunkState,
} from '../../../widgets/workflow_yaml_editor/lib/store/hooks/use_async_thunk';
import { selectWorkflowName } from '../../../widgets/workflow_yaml_editor/lib/store/selectors';
import { loadConnectorsThunk } from '../../../widgets/workflow_yaml_editor/lib/store/thunks/load_connectors_thunk';
import { loadWorkflowThunk } from '../../../widgets/workflow_yaml_editor/lib/store/thunks/load_workflow_thunk';

export function WorkflowDetailPage({ id }: { id?: string }) {
  const dispatch = useDispatch();
  const loadConnectors = useAsyncThunk(loadConnectorsThunk);
  const [loadWorkflow, { isLoading, error }] = useAsyncThunkState(loadWorkflowThunk);

  useEffect(() => {
    loadConnectors(); // dispatch load connectors on mount
  }, [loadConnectors]);

  useEffect(() => {
    if (id) {
      loadWorkflow({ id }); // sets loaded yaml string
    } else {
      dispatch(setYamlString(workflowDefaultYaml));
    }
  }, [loadWorkflow, id, dispatch]);

  const workflowName = useSelector(selectWorkflowName);
  useWorkflowsBreadcrumbs(workflowName);

  const { activeTab, selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();

  // TODO: manage it in a workflow state context
  const [highlightDiff, setHighlightDiff] = useState(false);

  const onCloseExecutionDetail = useCallback(() => {
    setSelectedExecution(null);
  }, [setSelectedExecution]);

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
          highlightDiff={highlightDiff}
          setHighlightDiff={setHighlightDiff}
        />
      </EuiFlexItem>
      <EuiFlexItem css={css({ overflow: 'hidden', minHeight: 0 })}>
        <WorkflowEditorLayout
          editor={<WorkflowDetailEditor highlightDiff={highlightDiff} />}
          executionList={
            id && activeTab === 'executions' && !selectedExecutionId ? (
              <WorkflowExecutionList workflowId={id} />
            ) : null
          }
          executionDetail={
            selectedExecutionId ? (
              <WorkflowExecutionDetail
                executionId={selectedExecutionId}
                onClose={onCloseExecutionDetail}
              />
            ) : null
          }
        />
        <WorkflowDetailTestModal />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
