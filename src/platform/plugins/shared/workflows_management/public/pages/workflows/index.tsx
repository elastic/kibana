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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageHeader,
  EuiPageTemplate,
  EuiSpacer,
  EuiFilterGroup,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useState } from 'react';
import { WORKFLOWS_TABLE_INITIAL_PAGE_SIZE } from '../../features/workflow_list/constants';
import type { WorkflowsSearchParams } from '../../types';
import { useWorkflowActions } from '../../entities/workflows/model/use_workflow_actions';
import { useWorkflows } from '../../entities/workflows/model/use_workflows';
import { WorkflowList } from '../../features/workflow_list/ui';
import { WorkflowExecutionStatsBar } from '../../features/workflow_executions_stats/ui';
import { useWorkflowFiltersOptions } from '../../entities/workflows/model/use_workflow_stats';
import { WorkflowSearchField } from '../../widgets/workflow_search_field/ui/workflow_search_field';
import { WorkflowsFilterPopover } from '../../widgets/workflow_filter_popover/workflow_filter_popover';

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
  const { data: filtersData } = useWorkflowFiltersOptions(['enabled', 'createdBy']);
  const { euiTheme } = useEuiTheme();
  const { createWorkflow } = useWorkflowActions();
  const [search, setSearch] = useState<WorkflowsSearchParams>({
    limit: WORKFLOWS_TABLE_INITIAL_PAGE_SIZE,
    page: 1,
    query: '',
  });

  const { refetch } = useWorkflows(search);

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
    <EuiPageTemplate offset={0} css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}>
      {/* negative margin to compensate for header's bottom padding and reduce space between header and content */}
      <EuiPageTemplate.Header
        bottomBorder={false}
        css={{ marginBottom: `-${euiTheme.size.l}` }}
        restrictWidth={false}
      >
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
                <EuiButton
                  iconType="plusInCircle"
                  color="primary"
                  size="s"
                  onClick={handleCreateWorkflow}
                >
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
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <WorkflowSearchField
              initialValue={search.query || ''}
              onSearch={(query) =>
                setSearch((prevState) => {
                  return { ...prevState, query };
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <WorkflowsFilterPopover
                filter="enabled"
                title="Enabled"
                values={filtersData?.enabled || []}
                selectedValues={search.enabled || []}
                onSelectedValuesChanged={(newValues) => {
                  setSearch((prevState) => {
                    return { ...prevState, enabled: newValues };
                  });
                }}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <WorkflowsFilterPopover
                filter="createdBy"
                title="Created By"
                values={filtersData?.createdBy || []}
                selectedValues={search.createdBy || []}
                onSelectedValuesChanged={(newValues) => {
                  setSearch((prevState) => {
                    return { ...prevState, createdBy: newValues };
                  });
                }}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />
        <WorkflowExecutionStatsBar height={140} />
        <EuiHorizontalRule />

        <WorkflowList search={search} setSearch={setSearch} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
