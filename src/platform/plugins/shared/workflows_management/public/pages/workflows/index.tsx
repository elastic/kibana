/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBetaBadge,
  EuiButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageTemplate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID } from '@kbn/workflows/common/constants';
import React, { useState } from 'react';
import { useWorkflowActions } from '../../entities/workflows/model/use_workflow_actions';
import { useWorkflowFiltersOptions } from '../../entities/workflows/model/use_workflow_stats';
import { useWorkflows } from '../../entities/workflows/model/use_workflows';
import { WorkflowExecutionStatsBar } from '../../features/workflow_executions_stats/ui';
import { WorkflowList } from '../../features/workflow_list';
import { WORKFLOWS_TABLE_INITIAL_PAGE_SIZE } from '../../features/workflow_list/constants';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { shouldShowWorkflowsEmptyState } from '../../shared/utils/workflow_utils';
import type { WorkflowsSearchParams } from '../../types';
import { WorkflowsFilterPopover } from '../../widgets/workflow_filter_popover/workflow_filter_popover';
import { WorkflowSearchField } from '../../widgets/workflow_search_field/ui/workflow_search_field';

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
  const { application, notifications, featureFlags } = useKibana().services;
  const { data: filtersData } = useWorkflowFiltersOptions(['enabled', 'createdBy']);
  const { euiTheme } = useEuiTheme();
  const { createWorkflow } = useWorkflowActions();
  const [search, setSearch] = useState<WorkflowsSearchParams>({
    limit: WORKFLOWS_TABLE_INITIAL_PAGE_SIZE,
    page: 1,
    query: '',
  });

  const { data: workflows, refetch } = useWorkflows(search);
  useWorkflowsBreadcrumbs();

  const canCreateWorkflow = application?.capabilities.workflowsManagement.createWorkflow;
  const isExecutionStatsBarEnabled = featureFlags?.getBooleanValue(
    WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID,
    false
  );

  // Check if we should show empty state
  const shouldShowEmptyState = shouldShowWorkflowsEmptyState(workflows, search);

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
          // Extract message from HTTP error body and update the error message
          if (
            error &&
            typeof error === 'object' &&
            'body' in error &&
            error.body &&
            typeof error.body === 'object' &&
            'message' in error.body &&
            typeof error.body.message === 'string'
          ) {
            (error as any).message = error.body.message;
          }

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
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="flexStart"
                  gutterSize="s"
                  responsive={false}
                  wrap={false}
                >
                  <EuiFlexItem grow={false}>
                    <FormattedMessage
                      id="workflows.pageTitle"
                      defaultMessage="Workflows"
                      ignoreTag
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBetaBadge
                      label={
                        <FormattedMessage
                          id="workflows.technicalPreviewBadge"
                          defaultMessage="Technical Preview"
                        />
                      }
                      title="Technical Preview"
                      size="s"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              {canCreateWorkflow && (
                <EuiButton
                  iconType="plusInCircle"
                  color="primary"
                  size="m"
                  fill
                  onClick={handleCreateWorkflow}
                >
                  <FormattedMessage
                    id="workflows.createWorkflowButton"
                    defaultMessage="Create a new workflow"
                    ignoreTag
                  />
                </EuiButton>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section restrictWidth={false}>
        {!shouldShowEmptyState && (
          <>
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
            {isExecutionStatsBarEnabled && <WorkflowExecutionStatsBar height={140} />}
          </>
        )}

        <WorkflowList
          search={search}
          setSearch={setSearch}
          onCreateWorkflow={handleCreateWorkflow}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
