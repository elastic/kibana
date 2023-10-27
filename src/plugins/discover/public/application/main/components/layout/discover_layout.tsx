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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  useEuiBackgroundColor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import classNames from 'classnames';
import { generateFilters } from '@kbn/data-plugin/public';
import { useDragDropContext } from '@kbn/dom-drag-drop';
import { DataViewField, DataViewType } from '@kbn/data-views-plugin/public';
import {
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_FIELD_STATISTICS,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import { popularizeField, useColumns } from '@kbn/unified-data-table';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { UnifiedFieldListSidebarContainerApi } from '@kbn/unified-field-list';
import { useSavedSearchInitial } from '../../services/discover_state_provider';
import { DiscoverStateContainer } from '../../services/discover_state';
import { VIEW_MODE } from '../../../../../common/constants';
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import { useInspector } from '../../hooks/use_inspector';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverNoResults } from '../no_results';
import { LoadingSpinner } from '../loading_spinner/loading_spinner';
import { DiscoverSidebarResponsive } from '../sidebar';
import { DiscoverTopNav } from '../top_nav/discover_topnav';
import { getResultState } from '../../utils/get_result_state';
import { DiscoverUninitialized } from '../uninitialized/uninitialized';
import { DataMainMsg, RecordRawType } from '../../services/discover_data_state_container';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import { SavedSearchURLConflictCallout } from '../../../../components/saved_search_url_conflict_callout/saved_search_url_conflict_callout';
import { DiscoverHistogramLayout } from './discover_histogram_layout';
import { ErrorCallout } from '../../../../components/common/error_callout';
import { addLog } from '../../../../utils/add_log';
import { DiscoverResizableLayout } from './discover_resizable_layout';
import { ESQLTechPreviewCallout } from './esql_tech_preview_callout';

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
    inspector,
    docLinks,
  } = useDiscoverServices();
  const { euiTheme } = useEuiTheme();
  const pageBackgroundColor = useEuiBackgroundColor('plain');
  const globalQueryState = data.query.getState();
  const { main$ } = stateContainer.dataState.data$;
  const [query, savedQuery, columns, sort] = useAppStateSelector((state) => [
    state.query,
    state.savedQuery,
    state.columns,
    state.sort,
  ]);
  const viewMode: VIEW_MODE = useAppStateSelector((state) => {
    if (uiSettings.get(SHOW_FIELD_STATISTICS) !== true) return VIEW_MODE.DOCUMENT_LEVEL;
    return state.viewMode ?? VIEW_MODE.DOCUMENT_LEVEL;
  });
  const dataView = useInternalStateSelector((state) => state.dataView!);
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

  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  const isPlainRecord = useMemo(() => getRawRecordType(query) === RecordRawType.PLAIN, [query]);
  const resultState = useMemo(
    () => getResultState(dataState.fetchStatus, dataState.foundDocuments!, isPlainRecord),
    [dataState.fetchStatus, dataState.foundDocuments, isPlainRecord]
  );

  const onOpenInspector = useInspector({
    inspector,
    stateContainer,
  });

  const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState: stateContainer.appState.update,
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

  const textBasedLanguageModeWarning = useMemo(() => {
    if (isPlainRecord) {
      return documentState.textBasedHeaderWarning;
    }
  }, [documentState.textBasedHeaderWarning, isPlainRecord]);

  const textBasedLanguageModeErrors = useMemo(() => {
    if (isPlainRecord) {
      return dataState.error;
    }
  }, [dataState.error, isPlainRecord]);

  const [sidebarContainer, setSidebarContainer] = useState<HTMLDivElement | null>(null);
  const [mainContainer, setMainContainer] = useState<HTMLDivElement | null>(null);

  const [{ dragging }] = useDragDropContext();
  const draggingFieldName = dragging?.id;

  const onDropFieldToTable = useMemo(() => {
    if (!draggingFieldName || currentColumns.includes(draggingFieldName)) {
      return undefined;
    }

    return () => onAddColumn(draggingFieldName);
  }, [onAddColumn, draggingFieldName, currentColumns]);

  const mainDisplay = useMemo(() => {
    if (resultState === 'uninitialized') {
      addLog('[DiscoverLayout] uninitialized triggers data fetching');
      return <DiscoverUninitialized onRefresh={() => stateContainer.dataState.fetch()} />;
    }

    return (
      <>
        {/* Temporarily display a tech preview callout for ES|QL*/}
        {isPlainRecord && <ESQLTechPreviewCallout docLinks={docLinks} />}
        <DiscoverHistogramLayout
          isPlainRecord={isPlainRecord}
          dataView={dataView}
          stateContainer={stateContainer}
          columns={currentColumns}
          viewMode={viewMode}
          onAddFilter={onAddFilter as DocViewFilterFn}
          onFieldEdited={onFieldEdited}
          container={mainContainer}
          onDropFieldToTable={onDropFieldToTable}
        />
        {resultState === 'loading' && <LoadingSpinner />}
      </>
    );
  }, [
    currentColumns,
    dataView,
    docLinks,
    isPlainRecord,
    mainContainer,
    onAddFilter,
    onDropFieldToTable,
    onFieldEdited,
    resultState,
    stateContainer,
    viewMode,
  ]);

  const [unifiedFieldListSidebarContainerApi, setUnifiedFieldListSidebarContainerApi] =
    useState<UnifiedFieldListSidebarContainerApi | null>(null);

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
        onOpenInspector={onOpenInspector}
        query={query}
        savedQuery={savedQuery}
        stateContainer={stateContainer}
        updateQuery={stateContainer.actions.onUpdateQuery}
        isPlainRecord={isPlainRecord}
        textBasedLanguageModeErrors={textBasedLanguageModeErrors}
        textBasedLanguageModeWarning={textBasedLanguageModeWarning}
        onFieldEdited={onFieldEdited}
      />
      <EuiPageBody className="dscPageBody" aria-describedby="savedSearchTitle">
        <div
          ref={setSidebarContainer}
          css={css`
            width: 100%;
            height: 100%;
          `}
        >
          <SavedSearchURLConflictCallout
            savedSearch={savedSearch}
            spaces={spaces}
            history={history}
          />
          <DiscoverResizableLayout
            container={sidebarContainer}
            unifiedFieldListSidebarContainerApi={unifiedFieldListSidebarContainerApi}
            sidebarPanel={
              <EuiFlexGroup
                gutterSize="none"
                css={css`
                  height: 100%;
                `}
              >
                <EuiFlexItem>
                  <SidebarMemoized
                    documents$={stateContainer.dataState.data$.documents$}
                    onAddField={onAddColumn}
                    columns={currentColumns}
                    onAddFilter={!isPlainRecord ? onAddFilter : undefined}
                    onRemoveField={onRemoveColumn}
                    onChangeDataView={stateContainer.actions.onChangeDataView}
                    selectedDataView={dataView}
                    trackUiMetric={trackUiMetric}
                    onFieldEdited={onFieldEdited}
                    onDataViewCreated={stateContainer.actions.onDataViewCreated}
                    availableFields$={stateContainer.dataState.data$.availableFields$}
                    unifiedFieldListSidebarContainerApi={unifiedFieldListSidebarContainerApi}
                    setUnifiedFieldListSidebarContainerApi={setUnifiedFieldListSidebarContainerApi}
                  />
                </EuiFlexItem>
                <EuiHideFor sizes={['xs', 's']}>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      border-right: ${euiTheme.border.thin};
                    `}
                  />
                </EuiHideFor>
              </EuiFlexGroup>
            }
            mainPanel={
              <div className="dscPageContent__wrapper">
                {resultState === 'none' ? (
                  dataState.error ? (
                    <ErrorCallout
                      title={i18n.translate(
                        'discover.noResults.searchExamples.noResultsErrorTitle',
                        {
                          defaultMessage: 'Unable to retrieve search results',
                        }
                      )}
                      error={dataState.error}
                      data-test-subj="discoverNoResultsError"
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
                  )
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
