/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonGroupOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowDetail } from '../../entities/workflows/model/useWorkflowDetail';
import { WorkflowEditor } from '../../features/workflow-editor/ui';
import { useWorkflowActions } from '../../entities/workflows/model/useWorkflowActions';

export function WorkflowDetailPage({ id }: { id: string }) {
  const { application, chrome } = useKibana().services;
  const { data: workflow, isLoading: isLoadingWorkflow, error } = useWorkflowDetail(id);

  chrome!.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
      href: application!.getUrlForApp('workflows', { path: '/' }),
    },
    { text: workflow?.name ?? 'Workflow Detail' },
  ]);

  const [workflowJson, setWorkflowJson] = useState(JSON.stringify(workflow, null, 2));
  const originalWorkflowJson = useMemo(() => JSON.stringify(workflow, null, 2), [workflow]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setWorkflowJson(JSON.stringify(workflow, null, 2));
    setHasChanges(false);
  }, [workflow]);

  const handleChange = (wfString: string) => {
    setWorkflowJson(wfString);
    setHasChanges(originalWorkflowJson !== wfString);
  };

  const [buttonGroupSelectedId, setButtonGroupSelectedId] = useState('workflow');
  const handleButtonGroupChange = (buttonGroupId: string) => {
    setButtonGroupSelectedId(buttonGroupId);
  };

  const { updateWorkflow } = useWorkflowActions();

  const handleSave = () => {
    updateWorkflow.mutate({
      id,
      workflow: JSON.parse(workflowJson),
    });
  };

  const handleRun = () => {
    console.log('run');
  };

  const buttonGroupOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: 'workflow',
        label: 'Workflow',
        iconType: 'grid', // todo: replace with correct icon
      },
      {
        id: 'executions',
        label: 'Executions',
        iconType: 'play',
      },
    ],
    []
  );

  if (isLoadingWorkflow) {
    return <EuiLoadingSpinner />;
  }

  if (error) {
    return <EuiText>Error loading workflow</EuiText>;
  }

  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header
        pageTitle={workflow?.name ?? 'Workflow Detail'}
        restrictWidth={false}
        rightSideItems={[
          <EuiButton color="text" size="s" onClick={handleSave} disabled={!hasChanges}>
            <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Save" ignoreTag />
          </EuiButton>,
          <EuiButton iconType="play" size="s" onClick={handleRun}>
            <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Run" ignoreTag />
          </EuiButton>,
        ]}
      >
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiButtonGroup
              color="primary"
              options={buttonGroupOptions}
              idSelected={buttonGroupSelectedId}
              legend="Switch between workflow and executions"
              type="single"
              onChange={handleButtonGroupChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section restrictWidth={false}>
        {workflow === undefined ? (
          <EuiText>Failed to load workflow</EuiText>
        ) : (
          <WorkflowEditor value={workflowJson} onChange={handleChange} hasChanges={hasChanges} />
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
