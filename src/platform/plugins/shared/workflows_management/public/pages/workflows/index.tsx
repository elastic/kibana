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
  EuiButtonEmpty,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageTemplate,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowsSearchParams } from '@kbn/workflows';
import { WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID } from '@kbn/workflows/common/constants';
import { useWorkflows, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import {
  parseBooleanFilterValue,
  parseWorkflowsUrlSearchParams,
  serializeWorkflowsUrlSearchParams,
} from './url_search_params';
import { PLUGIN_ID } from '../../../common';
import { useWorkflowFiltersOptions } from '../../entities/workflows/model/use_workflow_stats';
import { ImportWorkflowsFlyout } from '../../features/import_workflows/ui/import_workflows_flyout';
import { WorkflowExecutionStatsBar } from '../../features/workflow_executions_stats/ui';
import { WorkflowList } from '../../features/workflow_list';
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

  const search = useMemo(() => {
    return parseWorkflowsUrlSearchParams(location.search);
  }, [location.search]);

  const setSearch = useCallback(
    (newSearch: WorkflowsSearchParams) => {
      const serializedSearch = serializeWorkflowsUrlSearchParams(newSearch);
      void application.navigateToApp(PLUGIN_ID, {
        path: serializedSearch ? `?${serializedSearch}` : '',
        replace: true,
      });
    },
    [application]
  );

  const [showImportFlyout, setShowImportFlyout] = useState(false);

  const navigateToCreateWorkflow = useCallback(() => {
    application.navigateToApp(PLUGIN_ID, { path: '/create' });
  }, [application]);

  const { data: workflows } = useWorkflows(search);
  useWorkflowsBreadcrumbs();

  const { canCreateWorkflow, canUpdateWorkflow } = useWorkflowsCapabilities();
  /** Import uses bulk APIs that require both create and update; gate UI to match server authz. */
  const canImportWorkflows = Boolean(canCreateWorkflow && canUpdateWorkflow);
  const isExecutionStatsBarEnabled = featureFlags?.getBooleanValue(
    WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID,
    false
  );

  // Check if we should show empty state
  const shouldShowEmptyState = shouldShowWorkflowsEmptyState(workflows, search);

  return (
    <EuiPageTemplate
      offset={0}
      css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}
      data-test-subj="workflowsPage"
    >
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
            <EuiFlexGroup gutterSize="s">
              {canImportWorkflows ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="importAction"
                    size="m"
                    onClick={() => setShowImportFlyout(true)}
                    data-test-subj="importWorkflowsButton"
                  >
                    <FormattedMessage
                      id="workflows.importWorkflowsButton"
                      defaultMessage="Import"
                      ignoreTag
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
              {canCreateWorkflow ? (
                <EuiFlexItem grow={false}>
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
                      defaultMessage="Create workflow"
                      ignoreTag
                    />
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
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
                      const enabled = newValues
                        .map(parseBooleanFilterValue)
                        .filter((value): value is boolean => value !== undefined);

                      setSearch({
                        ...search,
                        enabled,
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
                      setSearch({ ...search, createdBy: newValues.map(String) });
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
                      setSearch({ ...search, tags: newValues.map(String) });
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
      {showImportFlyout ? (
        <ImportWorkflowsFlyout onClose={() => setShowImportFlyout(false)} />
      ) : null}
    </EuiPageTemplate>
  );
}
