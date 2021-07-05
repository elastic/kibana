/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './discover_layout.scss';
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  EuiSpacer,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { I18nProvider } from '@kbn/i18n/react';
import classNames from 'classnames';
import { DiscoverNoResults } from '../no_results';
import { LoadingSpinner } from '../loading_spinner/loading_spinner';
import {
  esFilters,
  IndexPatternField,
  indexPatterns as indexPatternsUtils,
} from '../../../../../../../data/public';
import { DiscoverSidebarResponsive } from '../sidebar';
import { DiscoverLayoutProps } from './types';
import { DOC_TABLE_LEGACY, SEARCH_FIELDS_FROM_SOURCE } from '../../../../../../common';
import { popularizeField } from '../../../../helpers/popularize_field';
import { DiscoverTopNav } from '../top_nav/discover_topnav';
import { DocViewFilterFn, ElasticSearchHit } from '../../../../doc_views/doc_views_types';
import { DiscoverChart } from '../chart';
import { getResultState } from '../../utils/get_result_state';
import { InspectorSession } from '../../../../../../../inspector/public';
import { DiscoverUninitialized } from '../uninitialized/uninitialized';
import { DataMainMsg } from '../../services/use_saved_search';
import { useDataGridColumns } from '../../../../helpers/use_data_grid_columns';
import { DiscoverDocuments } from './discover_documents';
import { FetchStatus } from '../../../../types';
import { useDataState } from '../../utils/use_data_state';

const SidebarMemoized = React.memo(DiscoverSidebarResponsive);
const TopNavMemoized = React.memo(DiscoverTopNav);
const DiscoverChartMemoized = React.memo(DiscoverChart);

export function DiscoverLayout({
  indexPattern,
  indexPatternList,
  inspectorAdapters,
  navigateTo,
  onChangeIndexPattern,
  onUpdateQuery,
  savedSearchRefetch$,
  resetQuery,
  savedSearchData$,
  savedSearch,
  searchSource,
  services,
  state,
  stateContainer,
}: DiscoverLayoutProps) {
  const { trackUiMetric, capabilities, indexPatterns, data, uiSettings, filterManager } = services;

  const [expandedDoc, setExpandedDoc] = useState<ElasticSearchHit | undefined>(undefined);
  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);
  const collapseIcon = useRef<HTMLButtonElement>(null);
  const fetchCounter = useRef<number>(0);
  const { main$, charts$, totalHits$ } = savedSearchData$;

  const dataState: DataMainMsg = useDataState(main$);

  useEffect(() => {
    if (dataState.fetchStatus === FetchStatus.LOADING) {
      fetchCounter.current++;
    }
  }, [dataState.fetchStatus]);

  // collapse icon isn't displayed in mobile view, use it to detect which view is displayed
  const isMobile = useCallback(() => collapseIcon && !collapseIcon.current, []);
  const timeField = useMemo(() => {
    return indexPatternsUtils.isDefault(indexPattern) ? indexPattern.timeFieldName : undefined;
  }, [indexPattern]);

  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const isLegacy = useMemo(() => uiSettings.get(DOC_TABLE_LEGACY), [uiSettings]);
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  const resultState = useMemo(
    () => getResultState(dataState.fetchStatus, dataState.foundDocuments!),
    [dataState.fetchStatus, dataState.foundDocuments]
  );

  const onOpenInspector = useCallback(() => {
    // prevent overlapping
    setExpandedDoc(undefined);
    const session = services.inspector.open(inspectorAdapters, {
      title: savedSearch.title,
    });
    setInspectorSession(session);
  }, [setExpandedDoc, inspectorAdapters, savedSearch, services.inspector]);

  useEffect(() => {
    return () => {
      if (inspectorSession) {
        // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
        inspectorSession.close();
      }
    };
  }, [inspectorSession]);

  const { columns, onAddColumn, onRemoveColumn } = useDataGridColumns({
    capabilities,
    config: uiSettings,
    indexPattern,
    indexPatterns,
    setAppState: stateContainer.setAppState,
    state,
    useNewFieldsApi,
  });

  const onAddFilter = useCallback(
    (field: IndexPatternField | string, values: string, operation: '+' | '-') => {
      const fieldName = typeof field === 'string' ? field : field.name;
      popularizeField(indexPattern, fieldName, indexPatterns);
      const newFilters = esFilters.generateFilters(
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
    [filterManager, indexPattern, indexPatterns, trackUiMetric]
  );

  const onEditRuntimeField = useCallback(() => {
    savedSearchRefetch$.next('reset');
  }, [savedSearchRefetch$]);

  const contentCentered = resultState === 'uninitialized';

  return (
    <I18nProvider>
      <EuiPage className="dscPage" data-fetch-counter={fetchCounter.current}>
        <TopNavMemoized
          indexPattern={indexPattern}
          onOpenInspector={onOpenInspector}
          query={state.query}
          navigateTo={navigateTo}
          savedQuery={state.savedQuery}
          savedSearch={savedSearch}
          searchSource={searchSource}
          services={services}
          stateContainer={stateContainer}
          updateQuery={onUpdateQuery}
        />
        <EuiPageBody className="dscPageBody" aria-describedby="savedSearchTitle">
          <h1 id="savedSearchTitle" className="euiScreenReaderOnly">
            {savedSearch.title}
          </h1>
          <EuiFlexGroup className="dscPageBody__contents" gutterSize="none">
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
                services={services}
                state={state}
                isClosed={isSidebarClosed}
                trackUiMetric={trackUiMetric}
                useNewFieldsApi={useNewFieldsApi}
                onEditRuntimeField={onEditRuntimeField}
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
                    onClick={() => setIsSidebarClosed(!isSidebarClosed)}
                    data-test-subj="collapseSideBarButton"
                    aria-controls="discover-sidebar"
                    aria-expanded={isSidebarClosed ? 'false' : 'true'}
                    aria-label={i18n.translate('discover.toggleSidebarAriaLabel', {
                      defaultMessage: 'Toggle sidebar',
                    })}
                    buttonRef={collapseIcon}
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
                })}
              >
                {resultState === 'none' && (
                  <DiscoverNoResults
                    timeFieldName={timeField}
                    queryLanguage={state.query?.language ?? ''}
                    data={data}
                    error={dataState.error}
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
                        indexPattern={indexPattern}
                        isLegacy={isLegacy}
                        state={state}
                        resetQuery={resetQuery}
                        savedSearch={savedSearch}
                        savedSearchDataChart$={charts$}
                        savedSearchDataTotalHits$={totalHits$}
                        services={services}
                        stateContainer={stateContainer}
                        timefield={timeField}
                      />
                    </EuiFlexItem>
                    <EuiHorizontalRule margin="none" />
                    <DiscoverDocuments
                      documents$={savedSearchData$.documents$}
                      expandedDoc={expandedDoc}
                      indexPattern={indexPattern}
                      isMobile={isMobile}
                      navigateTo={navigateTo}
                      onAddFilter={onAddFilter as DocViewFilterFn}
                      savedSearch={savedSearch}
                      services={services}
                      setExpandedDoc={setExpandedDoc}
                      state={state}
                      stateContainer={stateContainer}
                    />
                  </EuiFlexGroup>
                )}
              </EuiPageContent>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    </I18nProvider>
  );
}
