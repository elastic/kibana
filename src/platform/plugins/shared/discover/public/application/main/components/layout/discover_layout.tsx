/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './discover_layout.scss';
import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiProgress,
  EuiDelayRender,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { appendWhereClauseToESQLQuery, hasTransformationalCommand } from '@kbn/esql-utils';
import { METRIC_TYPE } from '@kbn/analytics';
import classNames from 'classnames';
import { generateFilters } from '@kbn/data-plugin/public';
import { useDragDropContext } from '@kbn/dom-drag-drop';
import { type DataViewField, DataViewType } from '@kbn/data-views-plugin/public';
import { SHOW_FIELD_STATISTICS, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { UseColumnsProps, popularizeField, useColumns } from '@kbn/unified-data-table';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { BehaviorSubject } from 'rxjs';
import { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import { useSavedSearchInitial } from '../../state_management/discover_state_provider';
import { DiscoverStateContainer } from '../../state_management/discover_state';
import { VIEW_MODE } from '../../../../../common/constants';
import { useInternalStateSelector } from '../../state_management/discover_internal_state_container';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverNoResults } from '../no_results';
import { LoadingSpinner } from '../loading_spinner/loading_spinner';
import { DiscoverSidebarResponsive } from '../sidebar';
import { DiscoverTopNav } from '../top_nav/discover_topnav';
import { getResultState } from '../../utils/get_result_state';
import { DiscoverUninitialized } from '../uninitialized/uninitialized';
import { DataMainMsg } from '../../state_management/discover_data_state_container';
import { FetchStatus, SidebarToggleState } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import { SavedSearchURLConflictCallout } from '../../../../components/saved_search_url_conflict_callout/saved_search_url_conflict_callout';
import { DiscoverHistogramLayout } from './discover_histogram_layout';
import { ErrorCallout } from '../../../../components/common/error_callout';
import { addLog } from '../../../../utils/add_log';
import { DiscoverResizableLayout } from './discover_resizable_layout';
import { PanelsToggle, PanelsToggleProps } from '../../../../components/panels_toggle';
import { sendErrorMsg } from '../../hooks/use_saved_search_messages';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

const SidebarMemoized = React.memo(DiscoverSidebarResponsive);
const TopNavMemoized = React.memo(DiscoverTopNav);

export interface DiscoverLayoutProps {
  stateContainer: DiscoverStateContainer;
}

export function DiscoverLayout({ stateContainer }: DiscoverLayoutProps) {
  const {
    trackUiMetric,
    capabilities,
    dataViews,
    data,
    uiSettings,
    filterManager,
    history,
    spaces,
    observabilityAIAssistant,
    dataVisualizer: dataVisualizerService,
    ebtManager,
    fieldsMetadata,
  } = useDiscoverServices();
  const { euiTheme } = useEuiTheme();
  const pageBackgroundColor = euiTheme.colors.backgroundBasePlain;
  const globalQueryState = data.query.getState();
  const { main$ } = stateContainer.dataState.data$;
  const [query, savedQuery, columns, sort, grid] = useAppStateSelector((state) => [
    state.query,
    state.savedQuery,
    state.columns,
    state.sort,
    state.grid,
  ]);
  const isEsqlMode = useIsEsqlMode();

  const viewMode: VIEW_MODE = useAppStateSelector((state) => {
    const fieldStatsNotAvailable =
      !uiSettings.get(SHOW_FIELD_STATISTICS) && !!dataVisualizerService;
    if (state.viewMode === VIEW_MODE.AGGREGATED_LEVEL && fieldStatsNotAvailable) {
      return VIEW_MODE.DOCUMENT_LEVEL;
    }
    return state.viewMode ?? VIEW_MODE.DOCUMENT_LEVEL;
  });
  const [dataView, dataViewLoading] = useInternalStateSelector((state) => [
    state.dataView!,
    state.isDataViewLoading,
  ]);
  const customFilters = useInternalStateSelector((state) => state.customFilters);

  const dataState: DataMainMsg = useDataState(main$);
  const savedSearch = useSavedSearchInitial();

  const fetchCounter = useRef<number>(0);

  useEffect(() => {
    if (dataState.fetchStatus === FetchStatus.LOADING) {
      fetchCounter.current++;
    }
  }, [dataState.fetchStatus]);

  // We treat rollup v1 data views as non time based in Discover, since we query them
  // in a non time based way using the regular _search API, since the internal
  // representation of those documents does not have the time field that _field_caps
  // reports us.
  const isTimeBased = useMemo(() => {
    return dataView.type !== DataViewType.ROLLUP && dataView.isTimeBased();
  }, [dataView]);

  const resultState = useMemo(
    () => getResultState(dataState.fetchStatus, dataState.foundDocuments ?? false),
    [dataState.fetchStatus, dataState.foundDocuments]
  );

  const setAppState = useCallback<UseColumnsProps['setAppState']>(
    ({ settings, ...rest }) => {
      stateContainer.appState.update({ ...rest, grid: settings as DiscoverGridSettings });
    },
    [stateContainer]
  );

  const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState,
    columns,
    sort,
    settings: grid,
  });

  const onAddColumnWithTracking = useCallback(
    (columnName: string) => {
      onAddColumn(columnName);
      void ebtManager.trackDataTableSelection({ fieldName: columnName, fieldsMetadata });
    },
    [onAddColumn, ebtManager, fieldsMetadata]
  );

  const onRemoveColumnWithTracking = useCallback(
    (columnName: string) => {
      onRemoveColumn(columnName);
      void ebtManager.trackDataTableRemoval({ fieldName: columnName, fieldsMetadata });
    },
    [onRemoveColumn, ebtManager, fieldsMetadata]
  );

  // The assistant is getting the state from the url correctly
  // expect from the index pattern where we have only the dataview id
  useEffect(() => {
    return observabilityAIAssistant?.service.setScreenContext({
      screenDescription: `The user is looking at the Discover view on the ${
        isEsqlMode ? 'ES|QL' : 'dataView'
      } mode. The index pattern is the ${dataView.getIndexPattern()}`,
    });
  }, [dataView, isEsqlMode, observabilityAIAssistant?.service]);

  const onAddFilter = useCallback<DocViewFilterFn>(
    (field, values, operation) => {
      if (!field) {
        return;
      }
      const fieldName = typeof field === 'string' ? field : field.name;
      popularizeField(dataView, fieldName, dataViews, capabilities);
      const newFilters = generateFilters(filterManager, field, values, operation, dataView);
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
      }
      void ebtManager.trackFilterAddition({
        fieldName: fieldName === '_exists_' ? String(values) : fieldName,
        filterOperation: fieldName === '_exists_' ? '_exists_' : operation,
        fieldsMetadata,
      });
      return filterManager.addFilters(newFilters);
    },
    [filterManager, dataView, dataViews, trackUiMetric, capabilities, ebtManager, fieldsMetadata]
  );

  const getOperator = (fieldName: string, values: unknown, operation: '+' | '-') => {
    if (fieldName === '_exists_') {
      return 'is_not_null';
    }
    if (values == null && operation === '-') {
      return 'is_not_null';
    }

    if (values == null && operation === '+') {
      return 'is_null';
    }

    return operation;
  };

  const onPopulateWhereClause = useCallback<DocViewFilterFn>(
    (field, values, operation) => {
      if (!field || !isOfAggregateQueryType(query)) {
        return;
      }
      const fieldName = typeof field === 'string' ? field : field.name;
      // send the field type for casting
      const fieldType = typeof field !== 'string' ? field.type : undefined;
      // weird existence logic from Discover components
      // in the field it comes the operator _exists_ and in the value the field
      // I need to take care of it here but I think it should be handled on the fieldlist instead
      const updatedQuery = appendWhereClauseToESQLQuery(
        query.esql,
        fieldName === '_exists_' ? String(values) : fieldName,
        fieldName === '_exists_' || values == null ? undefined : values,
        getOperator(fieldName, values, operation),
        fieldType
      );
      if (!updatedQuery) {
        return;
      }
      data.query.queryString.setQuery({
        esql: updatedQuery,
      });
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'esql_filter_added');
      }
      void ebtManager.trackFilterAddition({
        fieldName: fieldName === '_exists_' ? String(values) : fieldName,
        filterOperation: fieldName === '_exists_' ? '_exists_' : operation,
        fieldsMetadata,
      });
    },
    [data.query.queryString, query, trackUiMetric, ebtManager, fieldsMetadata]
  );

  const onFilter = isEsqlMode ? onPopulateWhereClause : onAddFilter;

  const canSetBreakdownField = useMemo(
    () =>
      isOfAggregateQueryType(query)
        ? dataView?.isTimeBased() && !hasTransformationalCommand(query.esql)
        : true,
    [dataView, query]
  );

  const onAddBreakdownField = useCallback(
    (field: DataViewField | undefined) => {
      stateContainer.appState.update({ breakdownField: field?.name });
    },
    [stateContainer]
  );

  const onFieldEdited = useCallback(
    async ({ removedFieldName }: { removedFieldName?: string } = {}) => {
      if (removedFieldName && currentColumns.includes(removedFieldName)) {
        onRemoveColumn(removedFieldName);
      }
      if (!dataView.isPersisted()) {
        await stateContainer.actions.updateAdHocDataViewId();
      }
      stateContainer.dataState.refetch$.next('reset');
    },
    [dataView, stateContainer, currentColumns, onRemoveColumn]
  );

  const onDisableFilters = useCallback(() => {
    const disabledFilters = filterManager
      .getFilters()
      .map((filter) => ({ ...filter, meta: { ...filter.meta, disabled: true } }));
    filterManager.setFilters(disabledFilters);
  }, [filterManager]);

  const contentCentered = resultState === 'uninitialized' || resultState === 'none';
  const documentState = useDataState(stateContainer.dataState.data$.documents$);

  const esqlModeWarning = useMemo(() => {
    if (isEsqlMode) {
      return documentState.esqlHeaderWarning;
    }
  }, [documentState.esqlHeaderWarning, isEsqlMode]);

  const esqlModeErrors = useMemo(() => {
    if (isEsqlMode) {
      return dataState.error;
    }
  }, [dataState.error, isEsqlMode]);

  const [sidebarContainer, setSidebarContainer] = useState<HTMLDivElement | null>(null);
  const [mainContainer, setMainContainer] = useState<HTMLDivElement | null>(null);

  const [{ dragging }] = useDragDropContext();
  const draggingFieldName = dragging?.id;

  const onDropFieldToTable = useMemo(() => {
    if (!draggingFieldName || currentColumns.includes(draggingFieldName)) {
      return undefined;
    }

    return () => onAddColumnWithTracking(draggingFieldName);
  }, [onAddColumnWithTracking, draggingFieldName, currentColumns]);

  const [sidebarToggleState$] = useState<BehaviorSubject<SidebarToggleState>>(
    () => new BehaviorSubject<SidebarToggleState>({ isCollapsed: false, toggle: () => {} })
  );

  const panelsToggle: ReactElement<PanelsToggleProps> = useMemo(() => {
    return (
      <PanelsToggle
        stateContainer={stateContainer}
        sidebarToggleState$={sidebarToggleState$}
        renderedFor="root"
        isChartAvailable={undefined}
      />
    );
  }, [stateContainer, sidebarToggleState$]);

  const mainDisplay = useMemo(() => {
    if (resultState === 'uninitialized') {
      addLog('[DiscoverLayout] uninitialized triggers data fetching');
      return <DiscoverUninitialized onRefresh={() => stateContainer.dataState.fetch()} />;
    }

    return (
      <>
        <DiscoverHistogramLayout
          dataView={dataView}
          stateContainer={stateContainer}
          columns={currentColumns}
          viewMode={viewMode}
          onAddFilter={onFilter}
          onFieldEdited={onFieldEdited}
          container={mainContainer}
          onDropFieldToTable={onDropFieldToTable}
          panelsToggle={panelsToggle}
        />
        {resultState === 'loading' && <LoadingSpinner />}
      </>
    );
  }, [
    resultState,
    dataView,
    stateContainer,
    currentColumns,
    viewMode,
    onFilter,
    onFieldEdited,
    mainContainer,
    onDropFieldToTable,
    panelsToggle,
  ]);

  const isLoading =
    documentState.fetchStatus === FetchStatus.LOADING ||
    documentState.fetchStatus === FetchStatus.PARTIAL;

  const onCancelClick = useCallback(() => {
    stateContainer.dataState.cancel();
    sendErrorMsg(stateContainer.dataState.data$.documents$);
    sendErrorMsg(stateContainer.dataState.data$.main$);
  }, [stateContainer.dataState]);

  return (
    <EuiPage
      className="dscPage"
      data-fetch-counter={fetchCounter.current}
      css={css`
        background-color: ${pageBackgroundColor};
      `}
    >
      <h1
        id="savedSearchTitle"
        className="euiScreenReaderOnly"
        data-test-subj="discoverSavedSearchTitle"
      >
        {savedSearch.title
          ? i18n.translate('discover.pageTitleWithSavedSearch', {
              defaultMessage: 'Discover - {savedSearchTitle}',
              values: {
                savedSearchTitle: savedSearch.title,
              },
            })
          : i18n.translate('discover.pageTitleWithoutSavedSearch', {
              defaultMessage: 'Discover - Search not yet saved',
            })}
      </h1>
      <TopNavMemoized
        savedQuery={savedQuery}
        stateContainer={stateContainer}
        esqlModeErrors={esqlModeErrors}
        esqlModeWarning={esqlModeWarning}
        onFieldEdited={onFieldEdited}
        isLoading={isLoading}
        onCancelClick={onCancelClick}
      />
      <EuiPageBody className="dscPageBody" aria-describedby="savedSearchTitle">
        <div
          ref={setSidebarContainer}
          css={css`
            width: 100%;
            height: 100%;
          `}
        >
          {dataViewLoading && (
            <EuiDelayRender delay={300}>
              <EuiProgress size="xs" color="accent" position="absolute" />
            </EuiDelayRender>
          )}
          <SavedSearchURLConflictCallout
            savedSearch={savedSearch}
            spaces={spaces}
            history={history}
          />
          <DiscoverResizableLayout
            container={sidebarContainer}
            sidebarToggleState$={sidebarToggleState$}
            sidebarPanel={
              <SidebarMemoized
                additionalFilters={customFilters}
                columns={currentColumns}
                documents$={stateContainer.dataState.data$.documents$}
                onAddBreakdownField={canSetBreakdownField ? onAddBreakdownField : undefined}
                onAddField={onAddColumnWithTracking}
                onAddFilter={onFilter}
                onChangeDataView={stateContainer.actions.onChangeDataView}
                onDataViewCreated={stateContainer.actions.onDataViewCreated}
                onFieldEdited={onFieldEdited}
                onRemoveField={onRemoveColumnWithTracking}
                selectedDataView={dataView}
                sidebarToggleState$={sidebarToggleState$}
                trackUiMetric={trackUiMetric}
              />
            }
            mainPanel={
              <div className="dscPageContent__wrapper">
                {resultState === 'none' ? (
                  <>
                    {React.isValidElement(panelsToggle) ? (
                      <div className="dscPageContent__panelsToggleWhenNoResults">
                        {React.cloneElement(panelsToggle, {
                          renderedFor: 'prompt',
                          isChartAvailable: false,
                        })}
                      </div>
                    ) : null}
                    {dataState.error ? (
                      <ErrorCallout
                        title={i18n.translate(
                          'discover.noResults.searchExamples.noResultsErrorTitle',
                          {
                            defaultMessage: 'Unable to retrieve search results',
                          }
                        )}
                        error={dataState.error}
                        isEsqlMode={isEsqlMode}
                      />
                    ) : (
                      <DiscoverNoResults
                        stateContainer={stateContainer}
                        isTimeBased={isTimeBased}
                        query={globalQueryState.query}
                        filters={globalQueryState.filters}
                        dataView={dataView}
                        onDisableFilters={onDisableFilters}
                      />
                    )}
                  </>
                ) : (
                  <EuiPanel
                    role="main"
                    panelRef={setMainContainer}
                    paddingSize="none"
                    borderRadius="none"
                    hasShadow={false}
                    hasBorder={false}
                    color="transparent"
                    className={classNames('dscPageContent', {
                      'dscPageContent--centered': contentCentered,
                    })}
                  >
                    {mainDisplay}
                  </EuiPanel>
                )}
              </div>
            }
          />
        </div>
      </EuiPageBody>
    </EuiPage>
  );
}
