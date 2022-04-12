/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './discover_layout.scss';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import classNames from 'classnames';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import { DiscoverNoResults } from '../no_results';
import { LoadingSpinner } from '../loading_spinner/loading_spinner';
import { generateFilters } from '../../../../../../data/public';
import { DataView, DataViewField, DataViewType } from '../../../../../../data_views/public';
import { DiscoverSidebarResponsive } from '../sidebar';
import { DiscoverLayoutProps } from './types';
import { SEARCH_FIELDS_FROM_SOURCE, SHOW_FIELD_STATISTICS } from '../../../../../common';
import { popularizeField } from '../../../../utils/popularize_field';
import { DiscoverTopNav } from '../top_nav/discover_topnav';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { DiscoverChart } from '../chart';
import { getResultState } from '../../utils/get_result_state';
import { InspectorSession } from '../../../../../../inspector/public';
import { DiscoverUninitialized } from '../uninitialized/uninitialized';
import { DataMainMsg } from '../../utils/use_saved_search';
import { useColumns } from '../../../../utils/use_data_grid_columns';
import { DiscoverDocuments } from './discover_documents';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../utils/use_data_state';
import {
  SavedSearchURLConflictCallout,
  useSavedSearchAliasMatchRedirect,
} from '../../../../services/saved_searches';
import { FieldStatisticsTable } from '../field_stats_table';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { DOCUMENTS_VIEW_CLICK, FIELD_STATISTICS_VIEW_CLICK } from '../field_stats_table/constants';
import { hasActiveFilter } from './utils';

/**
 * Local storage key for sidebar persistence state
 */
export const SIDEBAR_CLOSED_KEY = 'discover:sidebarClosed';

const SidebarMemoized = React.memo(DiscoverSidebarResponsive);
const TopNavMemoized = React.memo(DiscoverTopNav);
const DiscoverChartMemoized = React.memo(DiscoverChart);
const FieldStatisticsTableMemoized = React.memo(FieldStatisticsTable);

export function DiscoverLayout({
  indexPattern,
  indexPatternList,
  inspectorAdapters,
  expandedDoc,
  navigateTo,
  onChangeIndexPattern,
  onUpdateQuery,
  setExpandedDoc,
  savedSearchRefetch$,
  resetSavedSearch,
  savedSearchData$,
  savedSearch,
  searchSource,
  state,
  stateContainer,
}: DiscoverLayoutProps) {
  const {
    trackUiMetric,
    capabilities,
    indexPatterns,
    data,
    uiSettings,
    filterManager,
    storage,
    history,
    spaces,
    inspector,
  } = useDiscoverServices();
  const { main$, charts$, totalHits$ } = savedSearchData$;
  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);

  const viewMode = useMemo(() => {
    if (uiSettings.get(SHOW_FIELD_STATISTICS) !== true) return VIEW_MODE.DOCUMENT_LEVEL;
    return state.viewMode ?? VIEW_MODE.DOCUMENT_LEVEL;
  }, [uiSettings, state.viewMode]);

  const setDiscoverViewMode = useCallback(
    (mode: VIEW_MODE) => {
      stateContainer.setAppState({ viewMode: mode });

      if (trackUiMetric) {
        if (mode === VIEW_MODE.AGGREGATED_LEVEL) {
          trackUiMetric(METRIC_TYPE.CLICK, FIELD_STATISTICS_VIEW_CLICK);
        } else {
          trackUiMetric(METRIC_TYPE.CLICK, DOCUMENTS_VIEW_CLICK);
        }
      }
    },
    [trackUiMetric, stateContainer]
  );

  const fetchCounter = useRef<number>(0);
  const dataState: DataMainMsg = useDataState(main$);

  useEffect(() => {
    if (dataState.fetchStatus === FetchStatus.LOADING) {
      fetchCounter.current++;
    }
  }, [dataState.fetchStatus]);

  useSavedSearchAliasMatchRedirect({ savedSearch, spaces, history });

  // We treat rollup v1 data views as non time based in Discover, since we query them
  // in a non time based way using the regular _search API, since the internal
  // representation of those documents does not have the time field that _field_caps
  // reports us.
  const isTimeBased = useMemo(() => {
    return indexPattern.type !== DataViewType.ROLLUP && indexPattern.isTimeBased();
  }, [indexPattern]);

  const initialSidebarClosed = Boolean(storage.get(SIDEBAR_CLOSED_KEY));
  const [isSidebarClosed, setIsSidebarClosed] = useState(initialSidebarClosed);
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  const resultState = useMemo(
    () => getResultState(dataState.fetchStatus, dataState.foundDocuments!),
    [dataState.fetchStatus, dataState.foundDocuments]
  );

  const onOpenInspector = useCallback(() => {
    // prevent overlapping
    setExpandedDoc(undefined);
    const session = inspector.open(inspectorAdapters, {
      title: savedSearch.title,
    });
    setInspectorSession(session);
  }, [setExpandedDoc, inspectorAdapters, savedSearch, inspector]);

  useEffect(() => {
    return () => {
      if (inspectorSession) {
        // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
        inspectorSession.close();
      }
    };
  }, [inspectorSession]);

  const { columns, onAddColumn, onRemoveColumn } = useColumns({
    capabilities,
    config: uiSettings,
    indexPattern,
    indexPatterns,
    setAppState: stateContainer.setAppState,
    state,
    useNewFieldsApi,
  });

  const onAddFilter = useCallback(
    (field: DataViewField | string, values: string, operation: '+' | '-') => {
      const fieldName = typeof field === 'string' ? field : field.name;
      popularizeField(indexPattern, fieldName, indexPatterns, capabilities);
      const newFilters = generateFilters(
        filterManager,
        field,
        values,
        operation,
        String(indexPattern.id)
      );
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
      }
      return filterManager.addFilters(newFilters);
    },
    [filterManager, indexPattern, indexPatterns, trackUiMetric, capabilities]
  );

  const onEditRuntimeField = useCallback(() => {
    savedSearchRefetch$.next('reset');
  }, [savedSearchRefetch$]);

  const onDisableFilters = useCallback(() => {
    const disabledFilters = filterManager
      .getFilters()
      .map((filter) => ({ ...filter, meta: { ...filter.meta, disabled: true } }));
    filterManager.setFilters(disabledFilters);
  }, [filterManager]);

  const toggleSidebarCollapse = useCallback(() => {
    storage.set(SIDEBAR_CLOSED_KEY, !isSidebarClosed);
    setIsSidebarClosed(!isSidebarClosed);
  }, [isSidebarClosed, storage]);

  const contentCentered = resultState === 'uninitialized' || resultState === 'none';
  const onDataViewCreated = useCallback(
    (dataView: DataView) => {
      if (dataView.id) {
        onChangeIndexPattern(dataView.id);
      }
    },
    [onChangeIndexPattern]
  );

  return (
    <EuiPage className="dscPage" data-fetch-counter={fetchCounter.current}>
      <TopNavMemoized
        indexPattern={indexPattern}
        onOpenInspector={onOpenInspector}
        query={state.query}
        navigateTo={navigateTo}
        savedQuery={state.savedQuery}
        savedSearch={savedSearch}
        searchSource={searchSource}
        stateContainer={stateContainer}
        updateQuery={onUpdateQuery}
        resetSavedSearch={resetSavedSearch}
        onChangeIndexPattern={onChangeIndexPattern}
        onEditRuntimeField={onEditRuntimeField}
        useNewFieldsApi={useNewFieldsApi}
      />
      <EuiPageBody className="dscPageBody" aria-describedby="savedSearchTitle">
        <SavedSearchURLConflictCallout
          savedSearch={savedSearch}
          spaces={spaces}
          history={history}
        />
        <h1 id="savedSearchTitle" className="euiScreenReaderOnly">
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
        <EuiFlexGroup className="dscPageBody__contents" gutterSize="s">
          <EuiFlexItem grow={false}>
            <SidebarMemoized
              columns={columns}
              documents$={savedSearchData$.documents$}
              indexPatternList={indexPatternList}
              onAddField={onAddColumn}
              onAddFilter={onAddFilter}
              onRemoveField={onRemoveColumn}
              onChangeIndexPattern={onChangeIndexPattern}
              selectedIndexPattern={indexPattern}
              state={state}
              isClosed={isSidebarClosed}
              trackUiMetric={trackUiMetric}
              useNewFieldsApi={useNewFieldsApi}
              onEditRuntimeField={onEditRuntimeField}
              viewMode={viewMode}
              onDataViewCreated={onDataViewCreated}
              availableFields$={savedSearchData$.availableFields$}
            />
          </EuiFlexItem>
          <EuiHideFor sizes={['xs', 's']}>
            <EuiFlexItem grow={false}>
              <div>
                <EuiSpacer size="s" />
                <EuiButtonIcon
                  iconType={isSidebarClosed ? 'menuRight' : 'menuLeft'}
                  iconSize="m"
                  size="xs"
                  onClick={toggleSidebarCollapse}
                  data-test-subj="collapseSideBarButton"
                  aria-controls="discover-sidebar"
                  aria-expanded={isSidebarClosed ? 'false' : 'true'}
                  aria-label={i18n.translate('discover.toggleSidebarAriaLabel', {
                    defaultMessage: 'Toggle sidebar',
                  })}
                />
              </div>
            </EuiFlexItem>
          </EuiHideFor>
          <EuiFlexItem className="dscPageContent__wrapper">
            <EuiPageContent
              verticalPosition={contentCentered ? 'center' : undefined}
              horizontalPosition={contentCentered ? 'center' : undefined}
              paddingSize="none"
              hasShadow={false}
              className={classNames('dscPageContent', {
                'dscPageContent--centered': contentCentered,
                'dscPageContent--emptyPrompt': resultState === 'none',
              })}
            >
              {resultState === 'none' && (
                <DiscoverNoResults
                  isTimeBased={isTimeBased}
                  data={data}
                  error={dataState.error}
                  hasQuery={!!state.query?.query}
                  hasFilters={hasActiveFilter(state.filters)}
                  onDisableFilters={onDisableFilters}
                />
              )}
              {resultState === 'uninitialized' && (
                <DiscoverUninitialized onRefresh={() => savedSearchRefetch$.next()} />
              )}
              {resultState === 'loading' && <LoadingSpinner />}
              {resultState === 'ready' && (
                <EuiFlexGroup
                  className="dscPageContent__inner"
                  direction="column"
                  alignItems="stretch"
                  gutterSize="none"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <DiscoverChartMemoized
                      resetSavedSearch={resetSavedSearch}
                      savedSearch={savedSearch}
                      savedSearchDataChart$={charts$}
                      savedSearchDataTotalHits$={totalHits$}
                      stateContainer={stateContainer}
                      indexPattern={indexPattern}
                      viewMode={viewMode}
                      setDiscoverViewMode={setDiscoverViewMode}
                      hideChart={state.hideChart}
                      interval={state.interval}
                    />
                  </EuiFlexItem>
                  <EuiHorizontalRule margin="none" />
                  {viewMode === VIEW_MODE.DOCUMENT_LEVEL ? (
                    <DiscoverDocuments
                      documents$={savedSearchData$.documents$}
                      expandedDoc={expandedDoc}
                      indexPattern={indexPattern}
                      navigateTo={navigateTo}
                      onAddFilter={onAddFilter as DocViewFilterFn}
                      savedSearch={savedSearch}
                      setExpandedDoc={setExpandedDoc}
                      state={state}
                      stateContainer={stateContainer}
                    />
                  ) : (
                    <FieldStatisticsTableMemoized
                      availableFields$={savedSearchData$.availableFields$}
                      savedSearch={savedSearch}
                      indexPattern={indexPattern}
                      query={state.query}
                      filters={state.filters}
                      columns={columns}
                      stateContainer={stateContainer}
                      onAddFilter={onAddFilter}
                      trackUiMetric={trackUiMetric}
                      savedSearchRefetch$={savedSearchRefetch$}
                    />
                  )}
                </EuiFlexGroup>
              )}
            </EuiPageContent>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}
