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
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageTemplate,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowsSearchParams } from '@kbn/workflows';
import { WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID } from '@kbn/workflows/common/constants';
import { useWorkflows } from '@kbn/workflows-ui';
import { PLUGIN_ID } from '../../../common';
import { useWorkflowFiltersOptions } from '../../entities/workflows/model/use_workflow_stats';
import { WorkflowExecutionStatsBar } from '../../features/workflow_executions_stats/ui';
import { WorkflowList } from '../../features/workflow_list';
import { WORKFLOWS_TABLE_INITIAL_PAGE_SIZE } from '../../features/workflow_list/constants';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { shouldShowWorkflowsEmptyState } from '../../shared/utils/workflow_utils';
import { WorkflowsFilterPopover } from '../../widgets/workflow_filter_popover/workflow_filter_popover';
import { WorkflowSearchField } from '../../widgets/workflow_search_field/ui/workflow_search_field';

export function WorkflowsPage() {
  const { application, featureFlags } = useKibana().services;
  const { data: filtersData } = useWorkflowFiltersOptions(['enabled', 'createdBy', 'tags']);
  const { euiTheme } = useEuiTheme();
  const location = useLocation();
  const history = useHistory();

  // Keep filters in local state (not in URL)
  const [filters, setFilters] = useState<Partial<WorkflowsSearchParams>>({});

  // Derive search from URL params + local filters
  const search = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      size: Number(params.get('size')) || WORKFLOWS_TABLE_INITIAL_PAGE_SIZE,
      page: Number(params.get('page')) || 1,
      query: params.get('query') || '',
      ...filters, // merge in filters from state
    };
  }, [location.search, filters]);

  // Update search: sync query/page/size to URL, keep filters in state
  const setSearch = useCallback(
    (newSearch: WorkflowsSearchParams) => {
      // Extract URL params and filter params
      const { query, page, size, ...restFilters } = newSearch;

      // Update URL with query, page, size (only if non-default)
      const params = new URLSearchParams();

      if (query) {
        params.set('query', query);
      }

      // Only add page if not default (1)
      if (page && page !== 1) {
        params.set('page', String(page));
      }

      // Only add size if not default
      if (size && size !== WORKFLOWS_TABLE_INITIAL_PAGE_SIZE) {
        params.set('size', String(size));
      }

      history.replace({ search: params.toString() });

      // Update local filter state
      setFilters(restFilters);
    },
    [history]
  );

  const navigateToCreateWorkflow = useCallback(() => {
    application.navigateToApp(PLUGIN_ID, { path: '/create' });
  }, [application]);

  const { data: workflows } = useWorkflows(search);
  useWorkflowsBreadcrumbs();

  const canCreateWorkflow = application?.capabilities.workflowsManagement.createWorkflow;
  const isExecutionStatsBarEnabled = featureFlags?.getBooleanValue(
    WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID,
    false
  );

  // Check if we should show empty state
  const shouldShowEmptyState = shouldShowWorkflowsEmptyState(workflows, search);

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
                  size="m"
                  fill
                  onClick={navigateToCreateWorkflow}
                  data-test-subj="createWorkflowButton"
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
                  onSearch={(query) => setSearch({ ...search, query })}
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
                      setSearch({ ...search, enabled: newValues });
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
                      setSearch({ ...search, createdBy: newValues });
                    }}
                  />
                </EuiFilterGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <WorkflowsFilterPopover
                    filter="tags"
                    title="Tags"
                    values={filtersData?.tags || []}
                    selectedValues={search.tags || []}
                    onSelectedValuesChanged={(newValues) => {
                      setSearch({ ...search, tags: newValues });
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
          onCreateWorkflow={navigateToCreateWorkflow}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
