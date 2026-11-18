/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '@kbn/app-header';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import type { WorkflowsSearchParams } from '@kbn/workflows';
import {
  WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID,
  WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID,
} from '@kbn/workflows/common/constants';
import {
  useShowManagedWorkflowsSetting,
  useWorkflows,
  useWorkflowsCapabilities,
} from '@kbn/workflows-ui';
import {
  parseBooleanFilterValue,
  parseWorkflowsUrlSearchParams,
  serializeWorkflowsUrlSearchParams,
} from './url_search_params';
import { PLUGIN_ID, WORKFLOWS_DOCUMENTATION_URL } from '../../../common';
import { useWorkflowFiltersOptions } from '../../entities/workflows/model/use_workflow_stats';
import { ImportWorkflowsFlyout } from '../../features/import_workflows/ui/import_workflows_flyout';
import { WorkflowExecutionStatsBar } from '../../features/workflow_executions_stats/ui';
import { ManagedWorkflowsOffCallout } from '../../components/managed_workflows_off_callout/managed_workflows_off_callout';
import { WorkflowList } from '../../features/workflow_list';
import { useKibana } from '../../hooks/use_kibana';
import {
  MANAGED_OFF_NO_CUSTOM,
  NO_RESULTS_SEARCH_OR_FILTERS,
  READ_ONLY_NO_MANAGE,
  isPrototypeEmptyWorkflow,
  useWorkflowPrototypeScenario,
} from '../../shared/workflow_prototype_scenario';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { getAddConnectorsMenuItem } from '../../shared/ui/get_add_connectors_menu_item';
import { shouldShowWorkflowsEmptyState } from '../../shared/utils/workflow_utils';
import { WorkflowsFilterPopover } from '../../widgets/workflow_filter_popover/workflow_filter_popover';
import { WorkflowSearchField } from '../../widgets/workflow_search_field/ui/workflow_search_field';

const NO_RESULTS_CLEARED_KEY = 'workflows.prototypeNoResultsCleared';

const readNoResultsCleared = () => {
  try {
    return window.sessionStorage.getItem(NO_RESULTS_CLEARED_KEY) === 'true';
  } catch {
    return false;
  }
};

const MANAGED_FILTER_OPTIONS = [
  {
    label: i18n.translate('workflows.management.managedFilter.customOptionLabel', {
      defaultMessage: 'Custom',
    }),
    key: 'unmanaged',
  },
  {
    label: i18n.translate('workflows.management.managedFilter.managedOptionLabel', {
      defaultMessage: 'Managed',
    }),
    key: 'managed',
  },
];

const getSelectedManagedFilterValues = (
  managed: WorkflowsSearchParams['managed']
): Array<'unmanaged' | 'managed'> => {
  if (managed === 'all') {
    return ['unmanaged', 'managed'];
  }

  if (managed === 'managed') {
    return ['managed'];
  }

  return ['unmanaged'];
};

const getManagedFilterValue = (
  selectedValues: Array<'unmanaged' | 'managed'>
): WorkflowsSearchParams['managed'] => {
  const selectedValuesSet = new Set(selectedValues);
  const isCustomSelected = selectedValuesSet.has('unmanaged');
  const isManagedSelected = selectedValuesSet.has('managed');

  if (isCustomSelected && isManagedSelected) {
    return 'all';
  }

  if (isManagedSelected) {
    return 'managed';
  }

  return undefined;
};

const hasWorkflowSearchOrFilters = (search: WorkflowsSearchParams) =>
  Boolean(
    search.query ||
      search.enabled?.length ||
      search.createdBy?.length ||
      search.tags?.length ||
      (search.managed && search.managed !== 'unmanaged')
  );

export function WorkflowsPage() {
  const { application, featureFlags, notifications, uiSettings } = useKibana().services;
  const scenario = useWorkflowPrototypeScenario();
  const forceEmptyScenario = isPrototypeEmptyWorkflow(scenario);
  const forceNoResults = scenario === NO_RESULTS_SEARCH_OR_FILTERS;
  const forceManagedOffEmpty = scenario === MANAGED_OFF_NO_CUSTOM;
  const forceReadOnlyEmpty = scenario === READ_ONLY_NO_MANAGE;
  const [noResultsFiltersCleared, setNoResultsFiltersCleared] = useState(readNoResultsCleared);
  const [showRunnableExamples] = useState(
    () => new URLSearchParams(window.location.search).get('runnableExamples') === '1'
  );
  const scenarioOnMount = useRef(scenario);
  const isManagedWorkflowsSettingEnabled = useShowManagedWorkflowsSetting();
  const { canCreateWorkflow, canReadWorkflow, canReadManagedWorkflow, canUpdateWorkflow } =
    useWorkflowsCapabilities();
  const showManagedWorkflowsFilter = Boolean(
    isManagedWorkflowsSettingEnabled && canReadWorkflow && canReadManagedWorkflow
  );
  const showDemoNoResults = forceNoResults && !noResultsFiltersCleared;
  // The no-results prototype shows the View filter even when the setting is off,
  // so the empty table can be seen with Managed selected. The read-only prototype
  // shows the same filter so the list can be filtered without changing a workflow.
  const showManagedWorkflowsFilterControl =
    showManagedWorkflowsFilter || showDemoNoResults || forceReadOnlyEmpty;
  const { euiTheme } = useEuiTheme();
  const location = useLocation();

  const search = useMemo<WorkflowsSearchParams>(() => {
    const nextSearch = parseWorkflowsUrlSearchParams(location.search);

    if (!showManagedWorkflowsFilterControl) {
      const { managed, ...searchWithoutManaged } = nextSearch;
      return searchWithoutManaged;
    }

    return nextSearch;
  }, [location.search, showManagedWorkflowsFilterControl]);
  const { data: filtersData } = useWorkflowFiltersOptions(
    ['enabled', 'createdBy', 'tags'],
    showManagedWorkflowsFilter ? 'all' : undefined
  );

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

  /** Import uses bulk APIs that require both create and update; gate UI to match server authz. */
  const canImportWorkflows = Boolean(
    canCreateWorkflow && canUpdateWorkflow && !forceReadOnlyEmpty
  );
  const addConnectorsMenuItem = useMemo(() => getAddConnectorsMenuItem(application), [application]);
  const isExecutionStatsBarEnabled = featureFlags.useBooleanValue(
    WORKFLOW_EXECUTION_STATS_BAR_SETTING_ID,
    false
  );

  const showingExampleWorkflows =
    showRunnableExamples || (forceNoResults && noResultsFiltersCleared);
  const listHasConstraints = hasWorkflowSearchOrFilters(search);
  const showManagedOffEmpty =
    !showRunnableExamples &&
    !forceReadOnlyEmpty &&
    !forceEmptyScenario &&
    !showDemoNoResults &&
    !showingExampleWorkflows &&
    (forceManagedOffEmpty ||
      (!isManagedWorkflowsSettingEnabled && !listHasConstraints && workflows?.total === 0));
  const managedOffNoMatches =
    forceManagedOffEmpty && listHasConstraints && workflows?.total === 0;

  // A read-only user with nothing to list sees the table, not the first-use landing.
  const showReadOnlyTable =
    !forceEmptyScenario &&
    (forceReadOnlyEmpty || !canCreateWorkflow) &&
    shouldShowWorkflowsEmptyState(workflows, search);
  // Check if we should show empty state
  const shouldShowEmptyState =
    !showRunnableExamples &&
    !forceNoResults &&
    !showManagedOffEmpty &&
    !showReadOnlyTable &&
    (forceEmptyScenario || shouldShowWorkflowsEmptyState(workflows, search));
  const showLandingLayout = shouldShowEmptyState || showManagedOffEmpty;
  const shouldShowFilters =
    !forceEmptyScenario &&
    !showManagedOffEmpty &&
    (forceNoResults || !shouldShowEmptyState || showManagedWorkflowsFilter);
  useEffect(() => {
    if (scenarioOnMount.current === scenario) {
      return;
    }
    scenarioOnMount.current = scenario;
    try {
      window.sessionStorage.removeItem(NO_RESULTS_CLEARED_KEY);
    } catch {
      // Session storage can be blocked. The in-memory flag still resets.
    }
    setNoResultsFiltersCleared(false);
  }, [scenario]);

  const displayedSearchQuery = showDemoNoResults
    ? search.query || 'production deploy'
    : search.query || '';
  const displayedEnabledFilter =
    showDemoNoResults && (!search.enabled || search.enabled.length === 0)
      ? [true]
      : search.enabled || [];
  const displayedManagedFilter: Array<'unmanaged' | 'managed'> =
    showDemoNoResults && !search.managed
      ? ['managed']
      : getSelectedManagedFilterValues(search.managed);

  const clearSearchAndFilters = useCallback(() => {
    try {
      window.sessionStorage.setItem(NO_RESULTS_CLEARED_KEY, 'true');
    } catch {
      // Session storage can be blocked. The in-memory flag still updates this view.
    }
    setNoResultsFiltersCleared(true);
    setSearch({
      page: 1,
      size: search.size,
      query: '',
    });
  }, [search.size, setSearch]);

  const clearManagedOffSearch = useCallback(() => {
    setSearch({
      page: 1,
      size: search.size,
      query: '',
    });
  }, [search.size, setSearch]);

  const turnOnManagedWorkflows = useCallback(async () => {
    try {
      const saved = await uiSettings.set(WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID, true);
      if (!saved) {
        notifications.toasts.addDanger(
          i18n.translate('workflows.managedOffCallout.turnOnFailed', {
            defaultMessage: 'Managed workflows could not be turned on.',
          })
        );
        return;
      }
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('workflows.managedOffCallout.turnOnFailed', {
          defaultMessage: 'Managed workflows could not be turned on.',
        }),
      });
      return;
    }

    setSearch({
      ...search,
      page: 1,
      managed: 'all',
    });
  }, [notifications.toasts, search, setSearch, uiSettings]);

  const appMenu = useMemo<AppMenuConfig>(() => {
    const items: AppMenuItemType[] = [];
    if (canImportWorkflows) {
      items.push({
        id: 'importWorkflows',
        order: 1,
        label: i18n.translate('workflows.importWorkflowsButton', {
          defaultMessage: 'Import',
        }),
        iconType: 'download',
        overflow: true,
        run: () => setShowImportFlyout(true),
        testId: 'importWorkflowsButton',
      });
    }
    if (addConnectorsMenuItem && !forceReadOnlyEmpty) {
      items.push(addConnectorsMenuItem);
    }

    return {
      primaryActionItem: forceEmptyScenario || forceManagedOffEmpty
        ? undefined
        : {
            id: 'createWorkflow',
            label: i18n.translate('workflows.createWorkflowButton', {
              defaultMessage: 'Create workflow',
            }),
            iconType: 'plus',
            disableButton: !canCreateWorkflow || forceReadOnlyEmpty,
            run: navigateToCreateWorkflow,
            testId: 'createWorkflowButton',
          },
      items,
    };
  }, [
    addConnectorsMenuItem,
    canCreateWorkflow,
    canImportWorkflows,
    forceEmptyScenario,
    forceManagedOffEmpty,
    forceReadOnlyEmpty,
    navigateToCreateWorkflow,
  ]);

  return (
    <EuiPageTemplate
      offset={0}
      css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}
      data-test-subj="workflowsPage"
    >
      <AppHeader
        title={i18n.translate('workflows.pageTitle', { defaultMessage: 'Workflows' })}
        menu={appMenu}
        docLink={WORKFLOWS_DOCUMENTATION_URL}
        spacing="compact"
      />
      {/* With no workflows, fill the page so the landing centers below the filters. */}
      <EuiPageTemplate.Section
        restrictWidth={false}
        {...(showLandingLayout
          ? {
              grow: true,
              css: styles.fillColumn,
              contentProps: {
                css: showManagedOffEmpty
                  ? [styles.fillColumn, styles.calloutUnderHeader]
                  : styles.fillColumn,
              },
            }
          : {})}
      >
        {shouldShowFilters ? (
          // A plain wrapper keeps the filters at their height in the empty-state flex column.
          <div>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <WorkflowSearchField
                  initialValue={displayedSearchQuery}
                  onSearch={(query) => setSearch({ ...search, page: 1, query })}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <WorkflowsFilterPopover
                    filter="enabled"
                    title={i18n.translate('workflows.management.enabledFilter.title', {
                      defaultMessage: 'Enabled',
                    })}
                    values={
                      filtersData?.enabled?.length
                        ? filtersData.enabled
                        : showDemoNoResults
                          ? [{ label: 'Enabled', key: 'true' }]
                          : []
                    }
                    selectedValues={displayedEnabledFilter}
                    onSelectedValuesChanged={(newValues) => {
                      const enabled = newValues
                        .map(parseBooleanFilterValue)
                        .filter((value): value is boolean => value !== undefined);

                      setSearch({
                        ...search,
                        page: 1,
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
                    title={i18n.translate('workflows.management.createdByFilter.title', {
                      defaultMessage: 'Created By',
                    })}
                    values={filtersData?.createdBy || []}
                    selectedValues={search.createdBy || []}
                    onSelectedValuesChanged={(newValues) => {
                      setSearch({ ...search, page: 1, createdBy: newValues.map(String) });
                    }}
                  />
                </EuiFilterGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <WorkflowsFilterPopover
                    filter="tags"
                    title={i18n.translate('workflows.management.tagsFilter.title', {
                      defaultMessage: 'Tags',
                    })}
                    values={filtersData?.tags || []}
                    selectedValues={search.tags || []}
                    onSelectedValuesChanged={(newValues) => {
                      setSearch({ ...search, page: 1, tags: newValues.map(String) });
                    }}
                  />
                </EuiFilterGroup>
              </EuiFlexItem>
              {showManagedWorkflowsFilterControl ? (
                <EuiFlexItem grow={false}>
                  <EuiFilterGroup>
                    <WorkflowsFilterPopover
                      filter="managed"
                      title={i18n.translate('workflows.management.managedFilter.title', {
                        defaultMessage: 'View',
                      })}
                      values={MANAGED_FILTER_OPTIONS}
                      selectedValues={displayedManagedFilter}
                      onSelectedValuesChanged={(newValues) => {
                        const managed = getManagedFilterValue(
                          newValues as Array<'unmanaged' | 'managed'>
                        );
                        setSearch({ ...search, page: 1, managed });
                      }}
                    />
                  </EuiFilterGroup>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            {!shouldShowEmptyState && isExecutionStatsBarEnabled ? (
              <WorkflowExecutionStatsBar height={140} />
            ) : null}
          </div>
        ) : null}

        {showManagedOffEmpty ? (
          <ManagedWorkflowsOffCallout onTurnOn={turnOnManagedWorkflows} />
        ) : null}
        <div css={showLandingLayout ? styles.centeredEmptyState : undefined}>
          <WorkflowList
            search={search}
            setSearch={setSearch}
            forceNoResults={showDemoNoResults || managedOffNoMatches}
            showManagedOffEmpty={showManagedOffEmpty}
            forceReadOnlyEmpty={forceReadOnlyEmpty}
            showExampleWorkflows={showingExampleWorkflows}
            onClearSearchAndFilters={
              showDemoNoResults
                ? clearSearchAndFilters
                : managedOffNoMatches
                  ? clearManagedOffSearch
                  : undefined
            }
          />
        </div>
      </EuiPageTemplate.Section>
      {showImportFlyout ? (
        <ImportWorkflowsFlyout onClose={() => setShowImportFlyout(false)} />
      ) : null}
    </EuiPageTemplate>
  );
}

const styles = {
  fillColumn: css({ display: 'flex', flexDirection: 'column', flexGrow: 1 }),
  calloutUnderHeader: css({ paddingTop: 16 }),
  centeredEmptyState: css({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flexGrow: 1,
  }),
};
