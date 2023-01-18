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
  EuiPage,
  EuiPageBody,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { isOfQueryType } from '@kbn/es-query';
import classNames from 'classnames';
import { generateFilters } from '@kbn/data-plugin/public';
import { DataView, DataViewField, DataViewType } from '@kbn/data-views-plugin/public';
import { VIEW_MODE } from '../../../../../common/constants';
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import { useInspector } from '../../hooks/use_inspector';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverNoResults } from '../no_results';
import { LoadingSpinner } from '../loading_spinner/loading_spinner';
import { DiscoverSidebarResponsive } from '../sidebar';
import { DiscoverLayoutProps } from './types';
import { SEARCH_FIELDS_FROM_SOURCE, SHOW_FIELD_STATISTICS } from '../../../../../common';
import { popularizeField } from '../../../../utils/popularize_field';
import { DiscoverTopNav } from '../top_nav/discover_topnav';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { getResultState } from '../../utils/get_result_state';
import { DiscoverUninitialized } from '../uninitialized/uninitialized';
import { DataMainMsg, RecordRawType } from '../../services/discover_data_state_container';
import { useColumns } from '../../../../hooks/use_data_grid_columns';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import { hasActiveFilter } from './utils';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import { SavedSearchURLConflictCallout } from '../../../../components/saved_search_url_conflict_callout/saved_search_url_conflict_callout';
import { DiscoverHistogramLayout } from './discover_histogram_layout';

/**
 * Local storage key for sidebar persistence state
 */
export const SIDEBAR_CLOSED_KEY = 'discover:sidebarClosed';

const SidebarMemoized = React.memo(DiscoverSidebarResponsive);
const TopNavMemoized = React.memo(DiscoverTopNav);

export function DiscoverLayout({
  inspectorAdapters,
  expandedDoc,
  navigateTo,
  onChangeDataView,
  onUpdateQuery,
  setExpandedDoc,
  savedSearchFetch$,
  savedSearchRefetch$,
  resetSavedSearch,
  savedSearchData$,
  savedSearch,
  searchSource,
  stateContainer,
  persistDataView,
  updateAdHocDataViewId,
  searchSessionManager,
  updateDataViewList,
}: DiscoverLayoutProps) {
  const {
    trackUiMetric,
    capabilities,
    dataViews,
    data,
    uiSettings,
    filterManager,
    storage,
    history,
    spaces,
    inspector,
  } = useDiscoverServices();
  const { main$ } = savedSearchData$;
  const [query, savedQuery, filters, columns, sort] = useAppStateSelector((state) => [
    state.query,
    state.savedQuery,
    state.filters,
    state.columns,
    state.sort,
  ]);
  const viewMode: VIEW_MODE = useAppStateSelector((state) => {
    if (uiSettings.get(SHOW_FIELD_STATISTICS) !== true) return VIEW_MODE.DOCUMENT_LEVEL;
    return state.viewMode ?? VIEW_MODE.DOCUMENT_LEVEL;
  });
  const dataView = useInternalStateSelector((state) => state.dataView!);
  const dataState: DataMainMsg = useDataState(main$);

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

  const initialSidebarClosed = Boolean(storage.get(SIDEBAR_CLOSED_KEY));
  const [isSidebarClosed, setIsSidebarClosed] = useState(initialSidebarClosed);
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  const isPlainRecord = useMemo(() => getRawRecordType(query) === RecordRawType.PLAIN, [query]);
  const resultState = useMemo(
    () => getResultState(dataState.fetchStatus, dataState.foundDocuments!, isPlainRecord),
    [dataState.fetchStatus, dataState.foundDocuments, isPlainRecord]
  );

  const onOpenInspector = useInspector({
    setExpandedDoc,
    inspector,
    inspectorAdapters,
    savedSearch,
  });

  const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
  } = useColumns({
    capabilities,
    config: uiSettings,
    dataView,
    dataViews,
    setAppState: stateContainer.setAppState,
    useNewFieldsApi,
    columns,
    sort,
  });

  const onAddFilter = useCallback(
    (field: DataViewField | string, values: unknown, operation: '+' | '-') => {
      const fieldName = typeof field === 'string' ? field : field.name;
      popularizeField(dataView, fieldName, dataViews, capabilities);
      const newFilters = generateFilters(filterManager, field, values, operation, dataView);
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
      }
      return filterManager.addFilters(newFilters);
    },
    [filterManager, dataView, dataViews, trackUiMetric, capabilities]
  );

  const onFieldEdited = useCallback(async () => {
    if (!dataView.isPersisted()) {
      await updateAdHocDataViewId(dataView);
    }
    savedSearchRefetch$.next('reset');
  }, [dataView, savedSearchRefetch$, updateAdHocDataViewId]);

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
    async (nextDataView: DataView) => {
      if (!nextDataView.isPersisted()) {
        stateContainer.actions.appendAdHocDataViews(nextDataView);
      } else {
        await stateContainer.actions.loadDataViewList();
      }
      if (nextDataView.id) {
        onChangeDataView(nextDataView.id);
      }
    },
    [onChangeDataView, stateContainer]
  );

  const savedSearchTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    savedSearchTitle.current?.focus();
  }, []);

  const textBasedLanguageModeErrors = useMemo(() => {
    if (isPlainRecord) {
      return dataState.error;
    }
  }, [dataState.error, isPlainRecord]);

  const resizeRef = useRef<HTMLDivElement>(null);

  const mainDisplay = useMemo(() => {
    if (resultState === 'none') {
      return (
        <DiscoverNoResults
          isTimeBased={isTimeBased}
          data={data}
          error={dataState.error}
          hasQuery={isOfQueryType(query) && !!query?.query}
          hasFilters={hasActiveFilter(filters)}
          onDisableFilters={onDisableFilters}
        />
      );
    }

    if (resultState === 'uninitialized') {
      return <DiscoverUninitialized onRefresh={() => savedSearchRefetch$.next(undefined)} />;
    }

    return (
      <>
        <DiscoverHistogramLayout
          isPlainRecord={isPlainRecord}
          dataView={dataView}
          navigateTo={navigateTo}
          resetSavedSearch={resetSavedSearch}
          expandedDoc={expandedDoc}
          setExpandedDoc={setExpandedDoc}
          savedSearch={savedSearch}
          savedSearchData$={savedSearchData$}
          savedSearchFetch$={savedSearchFetch$}
          savedSearchRefetch$={savedSearchRefetch$}
          stateContainer={stateContainer}
          isTimeBased={isTimeBased}
          columns={currentColumns}
          viewMode={viewMode}
          onAddFilter={onAddFilter as DocViewFilterFn}
          onFieldEdited={onFieldEdited}
          resizeRef={resizeRef}
          inspectorAdapters={inspectorAdapters}
          searchSessionManager={searchSessionManager}
        />
        {resultState === 'loading' && <LoadingSpinner />}
      </>
    );
  }, [
    currentColumns,
    data,
    dataState.error,
    dataView,
    expandedDoc,
    filters,
    inspectorAdapters,
    isPlainRecord,
    isTimeBased,
    navigateTo,
    onAddFilter,
    onDisableFilters,
    onFieldEdited,
    query,
    resetSavedSearch,
    resultState,
    savedSearch,
    savedSearchData$,
    savedSearchFetch$,
    savedSearchRefetch$,
    searchSessionManager,
    setExpandedDoc,
    stateContainer,
    viewMode,
  ]);

  return (
    <EuiPage className="dscPage" data-fetch-counter={fetchCounter.current}>
      <h1
        id="savedSearchTitle"
        className="euiScreenReaderOnly"
        data-test-subj="discoverSavedSearchTitle"
        tabIndex={-1}
        ref={savedSearchTitle}
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
        onOpenInspector={onOpenInspector}
        query={query}
        navigateTo={navigateTo}
        savedQuery={savedQuery}
        savedSearch={savedSearch}
        searchSource={searchSource}
        stateContainer={stateContainer}
        updateQuery={onUpdateQuery}
        resetSavedSearch={resetSavedSearch}
        onChangeDataView={onChangeDataView}
        onDataViewCreated={onDataViewCreated}
        isPlainRecord={isPlainRecord}
        textBasedLanguageModeErrors={textBasedLanguageModeErrors}
        onFieldEdited={onFieldEdited}
        persistDataView={persistDataView}
        updateAdHocDataViewId={updateAdHocDataViewId}
        updateDataViewList={updateDataViewList}
      />
      <EuiPageBody className="dscPageBody" aria-describedby="savedSearchTitle">
        <SavedSearchURLConflictCallout
          savedSearch={savedSearch}
          spaces={spaces}
          history={history}
        />
        <EuiFlexGroup className="dscPageBody__contents" gutterSize="s">
          <EuiFlexItem grow={false} className="dscPageBody__sidebar">
            <SidebarMemoized
              documents$={savedSearchData$.documents$}
              onAddField={onAddColumn}
              columns={currentColumns}
              onAddFilter={!isPlainRecord ? onAddFilter : undefined}
              onRemoveField={onRemoveColumn}
              onChangeDataView={onChangeDataView}
              selectedDataView={dataView}
              isClosed={isSidebarClosed}
              trackUiMetric={trackUiMetric}
              useNewFieldsApi={useNewFieldsApi}
              onFieldEdited={onFieldEdited}
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
              panelRef={resizeRef}
              verticalPosition={contentCentered ? 'center' : undefined}
              horizontalPosition={contentCentered ? 'center' : undefined}
              paddingSize="none"
              hasShadow={false}
              className={classNames('dscPageContent', {
                'dscPageContent--centered': contentCentered,
                'dscPageContent--emptyPrompt': resultState === 'none',
              })}
            >
              {mainDisplay}
            </EuiPageContent>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}
