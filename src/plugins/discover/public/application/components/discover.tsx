/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './discover.scss';
import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  EuiButtonEmpty,
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
import moment from 'moment';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import classNames from 'classnames';
import { HitsCounter } from './hits_counter';
import { TimechartHeader } from './timechart_header';
import { DiscoverHistogram, DiscoverUninitialized } from '../angular/directives';
import { DiscoverNoResults } from './no_results';
import { LoadingSpinner } from './loading_spinner/loading_spinner';
import { DocTableLegacy } from '../angular/doc_table/create_doc_table_react';
import { SkipBottomButton } from './skip_bottom_button';
import { esFilters, IndexPatternField, search } from '../../../../data/public';
import { DiscoverSidebarResponsive } from './sidebar';
import { DiscoverProps } from './types';
import { getDisplayedColumns } from '../helpers/columns';
import { SortPairArr } from '../angular/doc_table/lib/get_sort';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../common';
import { popularizeField } from '../helpers/popularize_field';
import { getStateColumnActions } from '../angular/doc_table/actions/columns';
import { DocViewFilterFn } from '../doc_views/doc_views_types';
import { DiscoverGrid } from './discover_grid/discover_grid';
import { DiscoverTopNav } from './discover_topnav';
import { ElasticSearchHit } from '../doc_views/doc_views_types';

const DocTableLegacyMemoized = React.memo(DocTableLegacy);
const SidebarMemoized = React.memo(DiscoverSidebarResponsive);
const DataGridMemoized = React.memo(DiscoverGrid);
const TopNavMemoized = React.memo(DiscoverTopNav);

export function Discover({
  fetch,
  fetchCounter,
  fetchError,
  fieldCounts,
  histogramData,
  hits,
  indexPattern,
  minimumVisibleRows,
  onSkipBottomButtonClick,
  opts,
  resetQuery,
  resultState,
  rows,
  searchSource,
  state,
  timeRange,
  unmappedFieldsConfig,
}: DiscoverProps) {
  const [expandedDoc, setExpandedDoc] = useState<ElasticSearchHit | undefined>(undefined);
  const scrollableDesktop = useRef<HTMLDivElement>(null);
  const collapseIcon = useRef<HTMLButtonElement>(null);
  const isMobile = () => {
    // collapse icon isn't displayed in mobile view, use it to detect which view is displayed
    return collapseIcon && !collapseIcon.current;
  };
  const toggleHideChart = useCallback(() => {
    const newState = { ...state, hideChart: !state.hideChart };
    opts.stateContainer.setAppState(newState);
  }, [state, opts]);
  const hideChart = useMemo(() => state.hideChart, [state]);
  const { savedSearch, indexPatternList, config, services, data, setAppState } = opts;
  const { trackUiMetric, capabilities, indexPatterns } = services;
  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const bucketAggConfig = opts.chartAggConfigs?.aggs[1];
  const bucketInterval =
    bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
      ? bucketAggConfig.buckets?.getInterval()
      : undefined;
  const contentCentered = resultState === 'uninitialized';
  const isLegacy = services.uiSettings.get('doc_table:legacy');
  const useNewFieldsApi = !services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE);
  const updateQuery = useCallback(
    (_payload, isUpdate?: boolean) => {
      if (isUpdate === false) {
        opts.searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
        opts.refetch$.next();
      }
    },
    [opts]
  );

  const { onAddColumn, onRemoveColumn, onMoveColumn, onSetColumns } = useMemo(
    () =>
      getStateColumnActions({
        capabilities,
        indexPattern,
        indexPatterns,
        setAppState,
        state,
        useNewFieldsApi,
      }),
    [capabilities, indexPattern, indexPatterns, setAppState, state, useNewFieldsApi]
  );

  const onOpenInspector = useCallback(() => {
    // prevent overlapping
    setExpandedDoc(undefined);
  }, [setExpandedDoc]);

  const onSort = useCallback(
    (sort: string[][]) => {
      setAppState({ sort });
    },
    [setAppState]
  );

  const onAddFilter = useCallback(
    (field: IndexPatternField | string, values: string, operation: '+' | '-') => {
      const fieldName = typeof field === 'string' ? field : field.name;
      popularizeField(indexPattern, fieldName, indexPatterns);
      const newFilters = esFilters.generateFilters(
        opts.filterManager,
        field,
        values,
        operation,
        String(indexPattern.id)
      );
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
      }
      return opts.filterManager.addFilters(newFilters);
    },
    [opts, indexPattern, indexPatterns, trackUiMetric]
  );

  const onChangeInterval = useCallback(
    (interval: string) => {
      if (interval) {
        setAppState({ interval });
      }
    },
    [setAppState]
  );

  const timefilterUpdateHandler = useCallback(
    (ranges: { from: number; to: number }) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(ranges.from).toISOString(),
        to: moment(ranges.to).toISOString(),
        mode: 'absolute',
      });
    },
    [data]
  );

  const onBackToTop = useCallback(() => {
    if (scrollableDesktop && scrollableDesktop.current) {
      scrollableDesktop.current.focus();
    }
    // Only the desktop one needs to target a specific container
    if (!isMobile() && scrollableDesktop.current) {
      scrollableDesktop.current.scrollTo(0, 0);
    } else if (window) {
      window.scrollTo(0, 0);
    }
  }, [scrollableDesktop]);

  const onResize = useCallback(
    (colSettings: { columnId: string; width: number }) => {
      const grid = { ...state.grid } || {};
      const newColumns = { ...grid.columns } || {};
      newColumns[colSettings.columnId] = {
        width: colSettings.width,
      };
      const newGrid = { ...grid, columns: newColumns };
      opts.setAppState({ grid: newGrid });
    },
    [opts, state]
  );

  const columns = useMemo(() => {
    if (!state.columns) {
      return [];
    }
    return useNewFieldsApi ? state.columns.filter((col) => col !== '_source') : state.columns;
  }, [state, useNewFieldsApi]);
  return (
    <I18nProvider>
      <EuiPage className="dscPage" data-fetch-counter={fetchCounter}>
        <TopNavMemoized
          indexPattern={indexPattern}
          opts={opts}
          onOpenInspector={onOpenInspector}
          query={state.query}
          savedQuery={state.savedQuery}
          updateQuery={updateQuery}
          searchSource={searchSource}
        />
        <EuiPageBody className="dscPageBody" aria-describedby="savedSearchTitle">
          <h1 id="savedSearchTitle" className="euiScreenReaderOnly">
            {savedSearch.title}
          </h1>
          <EuiFlexGroup className="dscPageBody__contents" gutterSize="none">
            <EuiFlexItem grow={false}>
              <SidebarMemoized
                config={config}
                columns={columns}
                fieldCounts={fieldCounts}
                hits={rows}
                indexPatternList={indexPatternList}
                indexPatterns={indexPatterns}
                onAddField={onAddColumn}
                onAddFilter={onAddFilter}
                onRemoveField={onRemoveColumn}
                selectedIndexPattern={searchSource && searchSource.getField('index')}
                services={services}
                setAppState={setAppState}
                state={state}
                isClosed={isSidebarClosed}
                trackUiMetric={trackUiMetric}
                unmappedFieldsConfig={unmappedFieldsConfig}
                useNewFieldsApi={useNewFieldsApi}
              />
            </EuiFlexItem>
            <EuiHideFor sizes={['xs', 's']}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType={isSidebarClosed ? 'menuRight' : 'menuLeft'}
                  iconSize="m"
                  size="s"
                  onClick={() => setIsSidebarClosed(!isSidebarClosed)}
                  data-test-subj="collapseSideBarButton"
                  aria-controls="discover-sidebar"
                  aria-expanded={isSidebarClosed ? 'false' : 'true'}
                  aria-label={i18n.translate('discover.toggleSidebarAriaLabel', {
                    defaultMessage: 'Toggle sidebar',
                  })}
                  buttonRef={collapseIcon}
                />
              </EuiFlexItem>
            </EuiHideFor>
            <EuiFlexItem className="dscPageContent__wrapper">
              <EuiPageContent
                verticalPosition={contentCentered ? 'center' : undefined}
                horizontalPosition={contentCentered ? 'center' : undefined}
                paddingSize="none"
                className={classNames('dscPageContent', {
                  'dscPageContent--centered': contentCentered,
                })}
              >
                {resultState === 'none' && (
                  <DiscoverNoResults
                    timeFieldName={opts.timefield}
                    queryLanguage={state.query?.language || ''}
                    data={opts.data}
                    error={fetchError}
                  />
                )}
                {resultState === 'uninitialized' && <DiscoverUninitialized onRefresh={fetch} />}
                {resultState === 'loading' && <LoadingSpinner />}
                {resultState === 'ready' && (
                  <EuiFlexGroup
                    className="dscPageContent__inner"
                    direction="column"
                    alignItems="stretch"
                    gutterSize="none"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false} className="dscResultCount">
                      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                        <EuiFlexItem
                          grow={false}
                          className="dscResuntCount__title eui-textTruncate eui-textNoWrap"
                        >
                          <HitsCounter
                            hits={hits > 0 ? hits : 0}
                            showResetButton={!!(savedSearch && savedSearch.id)}
                            onResetQuery={resetQuery}
                          />
                        </EuiFlexItem>
                        {!hideChart && (
                          <EuiFlexItem className="dscResultCount__actions">
                            <TimechartHeader
                              dateFormat={opts.config.get('dateFormat')}
                              timeRange={timeRange}
                              options={search.aggs.intervalOptions}
                              onChangeInterval={onChangeInterval}
                              stateInterval={state.interval || ''}
                              bucketInterval={bucketInterval}
                            />
                          </EuiFlexItem>
                        )}
                        {opts.timefield && (
                          <EuiFlexItem className="dscResultCount__toggle" grow={false}>
                            <EuiButtonEmpty
                              size="xs"
                              iconType={!hideChart ? 'eyeClosed' : 'eye'}
                              onClick={() => {
                                toggleHideChart();
                              }}
                              data-test-subj="discoverChartToggle"
                            >
                              {!hideChart
                                ? i18n.translate('discover.hideChart', {
                                    defaultMessage: 'Hide chart',
                                  })
                                : i18n.translate('discover.showChart', {
                                    defaultMessage: 'Show chart',
                                  })}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                      {isLegacy && <SkipBottomButton onClick={onSkipBottomButtonClick} />}
                    </EuiFlexItem>
                    {!hideChart && opts.timefield && (
                      <EuiFlexItem grow={false}>
                        <section
                          aria-label={i18n.translate(
                            'discover.histogramOfFoundDocumentsAriaLabel',
                            {
                              defaultMessage: 'Histogram of found documents',
                            }
                          )}
                          className="dscTimechart"
                        >
                          {opts.chartAggConfigs && histogramData && rows.length !== 0 && (
                            <div
                              className={isLegacy ? 'dscHistogram' : 'dscHistogramGrid'}
                              data-test-subj="discoverChart"
                            >
                              <DiscoverHistogram
                                chartData={histogramData}
                                timefilterUpdateHandler={timefilterUpdateHandler}
                              />
                            </div>
                          )}
                        </section>
                        <EuiSpacer size="s" />
                      </EuiFlexItem>
                    )}

                    <EuiHorizontalRule margin="none" />

                    <EuiFlexItem className="eui-yScroll">
                      <section
                        className="dscTable eui-yScroll"
                        aria-labelledby="documentsAriaLabel"
                        ref={scrollableDesktop}
                        tabIndex={-1}
                      >
                        <h2 className="euiScreenReaderOnly" id="documentsAriaLabel">
                          <FormattedMessage
                            id="discover.documentsAriaLabel"
                            defaultMessage="Documents"
                          />
                        </h2>
                        {isLegacy && rows && rows.length && (
                          <DocTableLegacyMemoized
                            columns={columns}
                            indexPattern={indexPattern}
                            minimumVisibleRows={minimumVisibleRows}
                            rows={rows}
                            sort={state.sort || []}
                            searchDescription={opts.savedSearch.description}
                            searchTitle={opts.savedSearch.lastSavedTitle}
                            onAddColumn={onAddColumn}
                            onBackToTop={onBackToTop}
                            onFilter={onAddFilter}
                            onMoveColumn={onMoveColumn}
                            onRemoveColumn={onRemoveColumn}
                            onSort={onSort}
                            sampleSize={opts.sampleSize}
                            useNewFieldsApi={useNewFieldsApi}
                          />
                        )}
                        {!isLegacy && rows && rows.length && (
                          <div className="dscDiscoverGrid">
                            <DataGridMemoized
                              ariaLabelledBy="documentsAriaLabel"
                              columns={getDisplayedColumns(state.columns, indexPattern)}
                              expandedDoc={expandedDoc}
                              indexPattern={indexPattern}
                              rows={rows}
                              sort={(state.sort as SortPairArr[]) || []}
                              sampleSize={opts.sampleSize}
                              searchDescription={opts.savedSearch.description}
                              searchTitle={opts.savedSearch.lastSavedTitle}
                              setExpandedDoc={setExpandedDoc}
                              showTimeCol={
                                !config.get('doc_table:hideTimeColumn', false) &&
                                !!indexPattern.timeFieldName
                              }
                              services={services}
                              settings={state.grid}
                              onAddColumn={onAddColumn}
                              onFilter={onAddFilter as DocViewFilterFn}
                              onRemoveColumn={onRemoveColumn}
                              onSetColumns={onSetColumns}
                              onSort={onSort}
                              onResize={onResize}
                            />
                          </div>
                        )}
                      </section>
                    </EuiFlexItem>
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
