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
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID } from '@kbn/workflows';
import React, { useEffect, useMemo, useState } from 'react';
import { parseWorkflowYamlToJSON } from '../../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../common/schema';
import { useWorkflowActions } from '../../entities/workflows/model/useWorkflowActions';
import { useWorkflowDetail } from '../../entities/workflows/model/useWorkflowDetail';
import { TestWorkflowModal } from '../../features/run_workflow/ui/test_workflow_modal';
import { WorkflowEventModal } from '../../features/run_workflow/ui/workflow_event_modal';
import { WorkflowExecutionList } from '../../features/workflow_execution_list/ui';
import { useWorkflowUrlState } from '../../hooks/use_workflow_url_state';
import { WorkflowExecution } from '../../features/workflow_execution_detail/ui/workflow_execution';

const WorkflowYAMLEditor = React.lazy(() =>
  import('../../widgets/workflow_yaml_editor/ui').then((module) => ({
    default: module.WorkflowYAMLEditor,
  }))
);

// const WorkflowVisualEditor = React.lazy(() =>
//   import('../../features/workflow_visual_editor/ui').then((module) => ({
//     default: module.WorkflowVisualEditor,
//   }))
// );

export function WorkflowDetailPage({ id }: { id: string }) {
  const { euiTheme } = useEuiTheme();
  const { application, chrome, notifications, uiSettings } = useKibana().services;
  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = useWorkflowDetail(id);
  const [workflowEventModalOpen, setWorkflowEventModalOpen] = useState(false);
  const [testWorkflowModalOpen, setTestWorkflowModalOpen] = useState(false);

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

  const isVisualEditorEnabled = uiSettings?.get<boolean>(
    WORKFLOWS_UI_VISUAL_EDITOR_SETTING_ID,
    false
  );

  const [workflowYaml, setWorkflowYaml] = useState(workflow?.yaml ?? '');
  const originalWorkflowYaml = useMemo(() => workflow?.yaml ?? '', [workflow]);
  const [hasChanges, setHasChanges] = useState(false);

  const workflowYamlObject = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }
    const result = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    if (result.error) {
      return null;
    }
    return result.data;
  }, [workflowYaml]);

  useEffect(() => {
    setWorkflowYaml(workflow?.yaml ?? '');
    setHasChanges(false);
  }, [workflow]);

  const handleChange = (wfString: string) => {
    setWorkflowYaml(wfString);
    setHasChanges(originalWorkflowYaml !== wfString);
  };

  const { activeTab, setActiveTab, selectedExecutionId } = useWorkflowUrlState();

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

  const renderWorkflowEditor = () => {
    if (workflow === undefined) {
      <EuiText>Failed to load workflow</EuiText>;
    }
    return (
      <React.Suspense fallback={<EuiLoadingSpinner />}>
        <WorkflowYAMLEditor
          workflowId={workflow?.id ?? 'unknown'}
          filename={`${workflow?.id ?? 'unknown'}.yaml`}
          value={workflowYaml}
          onChange={(v) => handleChange(v ?? '')}
          hasChanges={hasChanges}
        />
      </React.Suspense>
    );
    // {isVisualEditorEnabled && (
    //   <EuiFlexItem>
    //     {workflowYamlObject && (
    //       <React.Suspense fallback={<EuiLoadingSpinner />}>
    //         <WorkflowVisualEditor workflow={workflowYamlObject as WorkflowYaml} />
    //       </React.Suspense>
    //     )}
    //   </EuiFlexItem>
    // )}
  };
  const renderWorkflowExecutions = () => {
    if (workflow === undefined) {
      return <EuiText>Failed to load workflow</EuiText>;
    }
    return <WorkflowExecutionList workflow={workflow} />;
  };

  if (workflowError) {
    const error = workflowError as Error;
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>Unable to load workflow</h2>}
        body={<p>There was an error loading the workflow. {error.message}</p>}
      />
    );
  }

  return (
    <>
      <EuiPageTemplate offset={0} minHeight={0} grow={false} css={{ flexGrow: 0 }}>
        <EuiPageTemplate.Header
          css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}
          pageTitle={
            <EuiSkeletonTitle
              size="l"
              isLoading={isLoadingWorkflow}
              contentAriaLabel={workflow?.name}
            >
              <EuiTitle size="l">
                <span>{workflow?.name}</span>
              </EuiTitle>
            </EuiSkeletonTitle>
          }
          tabs={[
            {
              label: 'Workflow',
              prepend: <EuiIcon type="grid" />,
              isSelected: activeTab === 'workflow',
              onClick: () => setActiveTab('workflow'),
            },
            {
              label: 'Executions',
              prepend: <EuiIcon type="play" />,
              isSelected: activeTab === 'executions',
              onClick: () => setActiveTab('executions'),
            },
          ]}
          restrictWidth={false}
          rightSideItems={[
            <EuiButton color="text" size="s" onClick={handleSave} disabled={!hasChanges}>
              <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Save" ignoreTag />
            </EuiButton>,
            <EuiButtonIcon
              color="success"
              display="base"
              iconType="play"
              size="s"
              onClick={handleRunClick}
            >
              <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Run" ignoreTag />
            </EuiButtonIcon>,
            <EuiButtonIcon
              display="base"
              iconType="beaker"
              size="s"
              onClick={() => setTestWorkflowModalOpen(true)}
            >
              <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Test" ignoreTag />
            </EuiButtonIcon>,
          ]}
        />
      </EuiPageTemplate>

      <EuiFlexGroup gutterSize="none" css={{ flex: 1, height: '100%', minHeight: 0 }}>
        {activeTab === 'executions' && (
          <EuiFlexItem
            css={{
              flexBasis: '275px',
              maxWidth: '275px',
              flex: 1,
              backgroundColor: euiTheme.colors.backgroundBasePlain,
              borderRight: `1px solid ${euiTheme.colors.lightShade}`,
            }}
          >
            {workflow && <WorkflowExecutionList workflow={workflow} />}
          </EuiFlexItem>
        )}
        <EuiFlexItem css={{ flex: 1, overflow: 'hidden' }}>{renderWorkflowEditor()}</EuiFlexItem>
        {selectedExecutionId && (
          <EuiFlexItem
            css={{
              flexBasis: '275px',
              maxWidth: '275px',
              flex: 1,
              borderLeft: `1px solid ${euiTheme.colors.lightShade}`,
            }}
          >
            {workflow && (
              <WorkflowExecution
                workflowExecutionId={selectedExecutionId}
                workflowYaml={workflow.yaml}
              />
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {workflowEventModalOpen && (
        <WorkflowEventModal
          onClose={() => setWorkflowEventModalOpen(false)}
          onSubmit={handleRunWorkflow}
        />
      )}
      {testWorkflowModalOpen && (
        <TestWorkflowModal
          workflowYaml={workflowYaml}
          onClose={() => setTestWorkflowModalOpen(false)}
        />
      )}
    </>
  );
}
