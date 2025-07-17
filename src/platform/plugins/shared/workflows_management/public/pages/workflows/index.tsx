/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiPageHeader } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CreateWorkflowCommand, WorkflowStatus } from '@kbn/workflows';
import { WorkflowList } from '../../features/workflow-list/ui';
import { useWorkflows } from '../../entities/workflows/model/useWorkflows';
import { useWorkflowActions } from '../../entities/workflows/model/useWorkflowActions';

const workflowTemplate: CreateWorkflowCommand = {
  name: 'New workflow',
  status: WorkflowStatus.DRAFT,
  triggers: [
    {
      id: 'manual',
      type: 'manual',
      enabled: true,
      config: {},
    },
  ],
  steps: [
    {
      id: 'first-step',
      type: 'console',
      with: {
        message: 'First step executed',
      },
    },
  ],
  tags: [],
  yaml: '',
  // yaml: `
  // name: New workflow
  // enabled: false
  // triggers:
  //   - type: elastic.triggers.manual
  // steps:
  //   - name: first-step
  //     type: console
  //     with:
  //       message: First step executed
  // `,
};

export function WorkflowsPage() {
  const { application, chrome, notifications } = useKibana().services;
  const { refetch } = useWorkflows();
  const { createWorkflow } = useWorkflowActions();

  chrome!.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
      href: application!.getUrlForApp('workflows', { path: '/' }),
    },
  ]);

  chrome!.docTitle.change([
    i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
  ]);

  const handleCreateWorkflow = () => {
    createWorkflow.mutate(workflowTemplate, {
      onSuccess: (data) => {
        application!.navigateToUrl(application!.getUrlForApp('workflows', { path: `/${data.id}` }));
        refetch();
      },
      onError: (error) => {
        notifications!.toasts.addError(error, {
          title: i18n.translate('workflows.createWorkflowError', {
            defaultMessage: 'Error creating workflow',
          }),
        });
      },
    });
  };

  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem>
            <EuiPageHeader
              pageTitle={
                <FormattedMessage id="workflows.pageTitle" defaultMessage="Workflows" ignoreTag />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiButton color="text" size="s" onClick={handleCreateWorkflow}>
                <FormattedMessage
                  id="workflows.createWorkflowButton"
                  defaultMessage="Create workflow"
                  ignoreTag
                />
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section restrictWidth={false}>
        <WorkflowList />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
