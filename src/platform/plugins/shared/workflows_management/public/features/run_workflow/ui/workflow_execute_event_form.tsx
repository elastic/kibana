/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DataLoadingState } from '@kbn/unified-data-table';
import type { WorkflowYaml } from '@kbn/workflows';
import { TIMEPICKER_FALLBACK } from './constants';
import { useTriggerEventSearch } from './use_trigger_event_search';
import { useTriggerEventTableConfig } from './use_trigger_event_table_config';
import { useWorkflowsEventsDataView } from './use_workflows_events_data_view';
import { WorkflowExecuteEventFormSearchResults } from './workflow_execute_event_form_search_results';
import {
  getWorkflowCustomTriggerTypeIds,
  isDefaultTriggerEventSearchScope,
} from './workflow_execute_modal_helpers';
import { useKibana } from '../../../hooks/use_kibana';
import { useSpaceId } from '../../../hooks/use_space_id';
import { useEventDrivenExecutionStatus } from '../../workflow_list/ui/use_event_driven_execution_status';

export { buildTriggerEventReplayInputs } from './workflow_execute_event_replay_inputs';

export interface WorkflowExecuteEventFormProps {
  definition: WorkflowYaml | null;
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  /** Clears validation errors when the table updates the run payload from the current selection. */
  setErrors?: (errors: string | null) => void;
  /** Number of rows currently selected in the trigger-events table (checkbox selection). */
  onTriggerEventTableSelectionCountChange?: (selectedCount: number) => void;
  /** Notifies the modal when UnifiedDataTable / EuiDataGrid fullscreen toggles. */
  onEventGridFullScreenChange?: (isFullScreen: boolean) => void;
  /** Switches the execute modal to the Manual tab from the empty-state action. */
  onOpenManualTab?: () => void;
}

export const WorkflowExecuteEventForm = ({
  definition,
  value: _value,
  setValue,
  errors,
  setErrors,
  onTriggerEventTableSelectionCountChange,
  onEventGridFullScreenChange,
  onOpenManualTab,
}: WorkflowExecuteEventFormProps): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const tableSurfaceColor = euiTheme.colors.backgroundBasePlain;
  const { services } = useKibana();
  const { SearchBar } = services.unifiedSearch.ui;

  const { eventDrivenExecutionEnabled, isLoading: isEventConfigLoading } =
    useEventDrivenExecutionStatus();

  const activeSpaceId = useSpaceId();
  const replaySpaceId = activeSpaceId ?? 'default';

  const customTriggerTypeIds = useMemo(
    () => getWorkflowCustomTriggerTypeIds(definition),
    [definition]
  );
  const customTriggerIdsKey = useMemo(
    () => customTriggerTypeIds.join('\0'),
    [customTriggerTypeIds]
  );

  const triggerEventsSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [isDataGridFullScreen, setIsDataGridFullScreen] = useState(false);

  const handleDataGridFullScreenChange = useCallback(
    (nextIsFullScreen: boolean) => {
      setIsDataGridFullScreen(nextIsFullScreen);
      onEventGridFullScreenChange?.(nextIsFullScreen);
    },
    [onEventGridFullScreenChange]
  );

  const dataView = useWorkflowsEventsDataView({
    dataViews: services.dataViews,
    toasts: services.notifications.toasts,
  });

  const queryEnabled =
    eventDrivenExecutionEnabled && !isEventConfigLoading && Boolean(services.http);

  const getTimeDefaults = useCallback(
    () => services.data?.query?.timefilter?.timefilter?.getTimeDefaults?.() ?? TIMEPICKER_FALLBACK,
    [services.data?.query?.timefilter?.timefilter]
  );

  const {
    query,
    submittedQuery,
    timeRange,
    searchResult,
    isError,
    searchError,
    rows,
    totalHits,
    onFetchMoreRecords,
    tableLoadingState,
    isFetching,
    handleQueryChange,
    handleQuerySubmit,
    handleRefresh,
  } = useTriggerEventSearch({
    definition,
    customTriggerTypeIds,
    customTriggerIdsKey,
    queryEnabled,
    isEventConfigLoading,
    getTimeDefaults,
  });

  useEffect(() => {
    if (rows.length === 0 && isDataGridFullScreen) {
      setIsDataGridFullScreen(false);
    }
  }, [rows.length, isDataGridFullScreen]);

  const documentCount = searchResult?.total ?? 0;

  const isDefaultTriggerScope = useMemo(
    () => isDefaultTriggerEventSearchScope(submittedQuery, customTriggerTypeIds),
    [submittedQuery, customTriggerTypeIds]
  );

  const showNoEventsEmptyState =
    tableLoadingState === DataLoadingState.loaded &&
    !isFetching &&
    !isError &&
    documentCount === 0 &&
    Boolean(dataView);

  const tableConfig = useTriggerEventTableConfig({
    services,
    dataView,
    rows,
    documentCount,
    replaySpaceId,
    setValue,
    setErrors,
    onTriggerEventTableSelectionCountChange,
  });

  if (!eventDrivenExecutionEnabled && !isEventConfigLoading) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate(
          'workflows.workflowExecuteEventTriggerForm.eventDrivenDisabledTitle',
          {
            defaultMessage: 'Event-driven execution is disabled',
          }
        )}
        color="warning"
        iconType="alert"
        size="s"
      >
        <EuiText size="s">
          {i18n.translate('workflows.workflowExecuteEventTriggerForm.eventDrivenDisabledBody', {
            defaultMessage:
              'Trigger-event logging and replay require event-driven workflows to be enabled in cluster configuration.',
          })}
        </EuiText>
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup
      className="workflowTriggerEventsRoot"
      direction="column"
      gutterSize="s"
      css={css({
        flex: 1,
        minHeight: 0,
        height: '100%',
      })}
    >
      {!isDataGridFullScreen ? (
        <EuiFlexItem grow={false}>
          <SearchBar
            appName="workflow_management"
            useDefaultBehaviors={true}
            disableSubscribingToGlobalDataServices={true}
            onQueryChange={handleQueryChange}
            onQuerySubmit={handleQuerySubmit}
            onRefresh={handleRefresh}
            query={query}
            indexPatterns={dataView ? [dataView] : []}
            showDatePicker={true}
            dateRangeFrom={timeRange.from}
            dateRangeTo={timeRange.to}
            showFilterBar={false}
            showSubmitButton={true}
            placeholder={i18n.translate(
              'workflows.workflowExecuteEventTriggerForm.searchPlaceholder',
              {
                defaultMessage: 'Filter using KQL (e.g. triggerId: my.trigger or eventId: abc)',
              }
            )}
            dataTestSubj="workflow-trigger-events-query-input"
            displayStyle="inPage"
          />
        </EuiFlexItem>
      ) : null}

      <WorkflowExecuteEventFormSearchResults
        isError={isError}
        searchError={searchError}
        errors={errors}
        triggerEventsSurfaceRef={triggerEventsSurfaceRef}
        euiTheme={euiTheme}
        tableSurfaceColor={tableSurfaceColor}
        timestampCellTypography={tableConfig.timestampCellTypography}
        tableLoadingState={tableLoadingState}
        dataView={dataView}
        getNoCellActions={tableConfig.getNoCellActions}
        visibleTableColumns={tableConfig.visibleTableColumns}
        columnsMeta={tableConfig.columnsMeta}
        dataTableRows={tableConfig.dataTableRows}
        rowsLength={rows.length}
        unifiedDataTableServices={tableConfig.unifiedDataTableServices}
        handleUnifiedDataTableSetColumns={tableConfig.handleUnifiedDataTableSetColumns}
        showTimeColumn={tableConfig.showTimeColumn}
        sort={tableConfig.sort}
        handleSortChange={tableConfig.handleSortChange}
        customGridColumnsConfiguration={tableConfig.customGridColumnsConfiguration}
        renderCustomToolbar={tableConfig.renderCustomToolbar}
        renderCellPopover={tableConfig.renderCellPopover}
        externalCustomRenderers={tableConfig.externalCustomRenderers}
        totalHits={totalHits}
        onFetchMoreRecords={onFetchMoreRecords}
        onDataGridFullScreenChange={handleDataGridFullScreenChange}
        showNoEventsEmptyState={showNoEventsEmptyState}
        isDefaultTriggerScope={isDefaultTriggerScope}
        onOpenManualTab={onOpenManualTab}
      />
    </EuiFlexGroup>
  );
};

WorkflowExecuteEventForm.displayName = 'WorkflowExecuteEventForm';
