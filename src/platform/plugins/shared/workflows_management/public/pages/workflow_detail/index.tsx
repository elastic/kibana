/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonGroupOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useMemo, useState } from 'react';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../common';
import { parseWorkflowYamlToJSON } from '../../../common/lib/yaml-utils';
import { useWorkflowActions } from '../../entities/workflows/model/useWorkflowActions';
import { useWorkflowDetail } from '../../entities/workflows/model/useWorkflowDetail';
import { WorkflowEventModal } from '../../features/run_workflow/ui/workflow_event_modal';
import { WorkflowEditor } from '../../features/workflow_editor/ui';
import { WorkflowExecutionList } from '../../features/workflow_execution_list/ui';
import { WorkflowVisualEditor } from '../../features/workflow_visual_editor/ui';
import { useWorkflowUrlState } from '../../hooks/use_workflow_url_state';

export function WorkflowDetailPage({ id }: { id: string }) {
  const { application, chrome, notifications } = useKibana().services;
  const { data: workflow, isLoading: isLoadingWorkflow, error } = useWorkflowDetail(id);

  const [workflowEventModalOpen, setWorkflowEventModalOpen] = useState(false);

  chrome!.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
      href: application!.getUrlForApp('workflows', { path: '/' }),
    },
    { text: workflow?.name ?? 'Workflow Detail' },
  ]);

  chrome!.docTitle.change([
    workflow?.name ?? 'Workflow Detail',
    i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
  ]);

  const [workflowYaml, setWorkflowYaml] = useState(workflow?.yaml ?? '');
  const originalWorkflowYaml = useMemo(() => workflow?.yaml ?? '', [workflow]);
  const [hasChanges, setHasChanges] = useState(false);

  const workflowYamlObject = useMemo(
    () => (workflowYaml ? parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE) : null),
    [workflowYaml]
  );

  useEffect(() => {
    setWorkflowYaml(workflow?.yaml ?? '');
    setHasChanges(false);
  }, [workflow]);

  const handleChange = (wfString: string) => {
    setWorkflowYaml(wfString);
    setHasChanges(originalWorkflowYaml !== wfString);
  };

  const { activeTab, setActiveTab } = useWorkflowUrlState();
  const handleButtonGroupChange = (buttonGroupId: string) => {
    setActiveTab(buttonGroupId as 'workflow' | 'executions');
  };

  const { updateWorkflow, runWorkflow } = useWorkflowActions();

  const handleSave = () => {
    updateWorkflow.mutate({
      id,
      workflow: {
        yaml: workflowYaml,
      },
    });
  };

  const handleRunClick = () => {
    setWorkflowEventModalOpen(true);
  };

  const handleRunWorkflow = (event: Record<string, any>) => {
    runWorkflow.mutate(
      { id, inputs: event },
      {
        onSuccess: () => {
          notifications?.toasts.addSuccess('Workflow run started', {
            toastLifeTimeMs: 3000,
          });
        },
        onError: (err: unknown) => {
          notifications?.toasts.addError(err as Error, {
            toastLifeTimeMs: 3000,
            title: 'Failed to run workflow',
          });
        },
      }
    );
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

  const renderWorkflowEditor = () => {
    if (workflow === undefined) {
      <EuiText>Failed to load workflow</EuiText>;
    }
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <WorkflowEditor
            workflowId={workflow?.id ?? ''}
            value={workflowYaml}
            onChange={handleChange}
            hasChanges={hasChanges}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {/* @ts-expect-error - TODO: fix this */}
          {workflowYamlObject?.data && <WorkflowVisualEditor workflow={workflowYamlObject.data} />}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };
  const renderWorkflowExecutions = () => {
    if (workflow === undefined) {
      return <EuiText>Failed to load workflow</EuiText>;
    }
    return <WorkflowExecutionList workflowId={workflow?.id} />;
  };

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
          <EuiButton iconType="play" size="s" onClick={handleRunClick}>
            <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Run" ignoreTag />
          </EuiButton>,
        ]}
      >
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiButtonGroup
              color="primary"
              options={buttonGroupOptions}
              idSelected={activeTab}
              legend="Switch between workflow and executions"
              type="single"
              onChange={handleButtonGroupChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section restrictWidth={false}>
        {activeTab === 'workflow' ? renderWorkflowEditor() : renderWorkflowExecutions()}
      </EuiPageTemplate.Section>
      {workflowEventModalOpen && (
        <WorkflowEventModal
          onClose={() => setWorkflowEventModalOpen(false)}
          onSubmit={handleRunWorkflow}
        />
      )}
    </EuiPageTemplate>
  );
}
