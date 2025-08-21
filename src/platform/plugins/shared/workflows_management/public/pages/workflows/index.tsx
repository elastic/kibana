/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPageHeader, EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useWorkflowActions } from '../../entities/workflows/model/useWorkflowActions';
import { useWorkflows } from '../../entities/workflows/model/useWorkflows';
import { WorkflowList } from '../../features/workflow_list/ui';

const workflowTemplateYaml = `name: New workflow
enabled: false
triggers:
  - type: manual
steps:
  - name: first-step
    type: console
    with:
      message: First step executed
`;

export function WorkflowsPage() {
  const { application, chrome, notifications } = useKibana().services;
  const { refetch } = useWorkflows();
  const { createWorkflow } = useWorkflowActions();

  const canCreateWorkflow = application?.capabilities.workflowsManagement.createWorkflow;

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
    createWorkflow.mutate(
      { yaml: workflowTemplateYaml },
      {
        onSuccess: (data) => {
          application!.navigateToUrl(
            application!.getUrlForApp('workflows', { path: `/${data.id}` })
          );
          refetch();
        },
        onError: (error) => {
          notifications!.toasts.addError(error, {
            title: i18n.translate('workflows.createWorkflowError', {
              defaultMessage: 'Error creating workflow',
            }),
          });
        },
      }
    );
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
              {canCreateWorkflow && (
                <EuiButton color="text" size="s" onClick={handleCreateWorkflow}>
                  <FormattedMessage
                    id="workflows.createWorkflowButton"
                    defaultMessage="Create workflow"
                    ignoreTag
                  />
                </EuiButton>
              )}
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
