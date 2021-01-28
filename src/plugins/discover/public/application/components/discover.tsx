/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import './discover.scss';
import React, { useState, useRef } from 'react';
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
import { getServices } from '../../kibana_services';
import { DiscoverHistogram, DiscoverUninitialized } from '../angular/directives';
import { DiscoverNoResults } from './no_results';
import { LoadingSpinner } from './loading_spinner/loading_spinner';
import { DocTableLegacy, DocTableLegacyProps } from '../angular/doc_table/create_doc_table_react';
import { SkipBottomButton } from './skip_bottom_button';
import { esFilters, IndexPatternField, search } from '../../../../data/public';
import {
  DiscoverSidebarResponsive,
  DiscoverSidebarResponsiveProps,
} from './sidebar/discover_sidebar_responsive';
import { DiscoverProps } from './types';
import { getDisplayedColumns } from '../helpers/columns';
import { SortPairArr } from '../angular/doc_table/lib/get_sort';
import { DiscoverGrid, DiscoverGridProps } from './discover_grid/discover_grid';
import { MODIFY_COLUMNS_ON_SWITCH, SEARCH_FIELDS_FROM_SOURCE } from '../../../common';
import { popularizeField } from '../helpers/popularize_field';
import * as columnActions from '../angular/doc_table/actions/columns';
import { DocViewFilterFn } from '../doc_views/doc_views_types';
import { getSwitchIndexPatternAppState } from '../helpers/get_switch_index_pattern_app_state';

const DocTableLegacyMemoized = React.memo((props: DocTableLegacyProps) => (
  <DocTableLegacy {...props} />
));
const SidebarMemoized = React.memo((props: DiscoverSidebarResponsiveProps) => (
  <DiscoverSidebarResponsive {...props} />
));

const DataGridMemoized = React.memo((props: DiscoverGridProps) => <DiscoverGrid {...props} />);

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
  topNavMenu,
  updateQuery,
  updateSavedQueryId,
}: DiscoverProps) {
  const scrollableDesktop = useRef<HTMLDivElement>(null);
  const collapseIcon = useRef<HTMLButtonElement>(null);
  const isMobile = () => {
    // collapse icon isn't displayed in mobile view, use it to detect which view is displayed
    return collapseIcon && !collapseIcon.current;
  };

  const [toggleOn, toggleChart] = useState(true);
  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const services = getServices();
  const { TopNavMenu } = services.navigation.ui;
  const { trackUiMetric, capabilities, indexPatterns } = services;
  const { savedSearch, indexPatternList, config, setAppState, data } = opts;
  const bucketAggConfig = opts.chartAggConfigs?.aggs[1];
  const bucketInterval =
    bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
      ? bucketAggConfig.buckets?.getInterval()
      : undefined;
  const contentCentered = resultState === 'uninitialized';
  const isLegacy = services.uiSettings.get('doc_table:legacy');
  const useNewFieldsApi = !services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE);

  function onAddColumn(columnName: string) {
    if (capabilities.discover.save) {
      popularizeField(indexPattern, columnName, indexPatterns);
    }
    const columns = columnActions.addColumn(state.columns || [], columnName, useNewFieldsApi);
    setAppState({ columns });
  }

  function onRemoveColumn(columnName: string) {
    if (capabilities.discover.save) {
      popularizeField(indexPattern, columnName, indexPatterns);
    }
    const columns = columnActions.removeColumn(state.columns || [], columnName, useNewFieldsApi);
    // The state's sort property is an array of [sortByColumn,sortDirection]
    const sort =
      state.sort && state.sort.length
        ? state.sort.filter((subArr) => subArr[0] !== columnName)
        : [];
    setAppState({ columns, sort });
  }

  function onMoveColumn(columnName: string, newIndex: number) {
    const columns = columnActions.moveColumn(state.columns || [], columnName, newIndex);
    setAppState({ columns });
  }

  function onSetColumns(columns: string[]) {
    // remove first element of columns if it's the configured timeFieldName, which is prepended automatically
    const actualColumns =
      indexPattern.timeFieldName && indexPattern.timeFieldName === columns[0]
        ? columns.slice(1)
        : columns;
    setAppState({ columns: actualColumns });
  }

  function onSort(sort: string[][]) {
    setAppState({ sort });
  }

  function onAddFilter(field: IndexPatternField | string, values: string, operation: '+' | '-') {
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
  }

  async function setIndexPattern(id: string) {
    const nextIndexPattern = await indexPatterns.get(id);
    if (nextIndexPattern) {
      const nextAppState = getSwitchIndexPatternAppState(
        indexPattern,
        nextIndexPattern,
        state.columns || [],
        (state.sort || []) as SortPairArr[],
        config.get(MODIFY_COLUMNS_ON_SWITCH),
        useNewFieldsApi
      );
      await setAppState(nextAppState);
    }
  }

  function onChangeInterval(interval: string) {
    if (interval) {
      setAppState({ interval });
    }
  }

  function timefilterUpdateHandler(ranges: { from: number; to: number }) {
    data.query.timefilter.timefilter.setTime({
      from: moment(ranges.from).toISOString(),
      to: moment(ranges.to).toISOString(),
      mode: 'absolute',
    });
  }

  return (
    <I18nProvider>
      <EuiPage className="dscPage" data-fetch-counter={fetchCounter}>
        <TopNavMenu
          appName="discover"
          config={topNavMenu}
          indexPatterns={[indexPattern]}
          onQuerySubmit={updateQuery}
          onSavedQueryIdChange={updateSavedQueryId}
          query={state.query}
          setMenuMountPoint={opts.setHeaderActionMenu}
          savedQueryId={state.savedQuery}
          screenTitle={savedSearch.title}
          showDatePicker={indexPattern.isTimeBased()}
          showSaveQuery={!!services.capabilities.discover.saveQuery}
          showSearchBar={true}
          useDefaultBehaviors={true}
        />
        <EuiPageBody className="dscPageBody" aria-describedby="savedSearchTitle">
          <h1 id="savedSearchTitle" className="euiScreenReaderOnly">
            {savedSearch.title}
          </h1>
          <EuiFlexGroup className="dscPageBody__contents" gutterSize="none">
            <EuiFlexItem grow={false}>
              <SidebarMemoized
                columns={state.columns || []}
                fieldCounts={fieldCounts}
                hits={rows}
                indexPatternList={indexPatternList}
                onAddField={onAddColumn}
                onAddFilter={onAddFilter}
                onRemoveField={onRemoveColumn}
                selectedIndexPattern={searchSource && searchSource.getField('index')}
                services={services}
                setIndexPattern={setIndexPattern}
                isClosed={isSidebarClosed}
                trackUiMetric={trackUiMetric}
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
                        {toggleOn && (
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
                              iconType={toggleOn ? 'eyeClosed' : 'eye'}
                              onClick={() => {
                                toggleChart(!toggleOn);
                              }}
                              data-test-subj="discoverChartToggle"
                            >
                              {toggleOn
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
                    {toggleOn && opts.timefield && (
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
                            columns={state.columns || []}
                            indexPattern={indexPattern}
                            minimumVisibleRows={minimumVisibleRows}
                            rows={rows}
                            sort={state.sort || []}
                            searchDescription={opts.savedSearch.description}
                            searchTitle={opts.savedSearch.lastSavedTitle}
                            onAddColumn={onAddColumn}
                            onBackToTop={() => {
                              if (scrollableDesktop && scrollableDesktop.current) {
                                scrollableDesktop.current.focus();
                              }
                              // Only the desktop one needs to target a specific container
                              if (!isMobile() && scrollableDesktop.current) {
                                scrollableDesktop.current.scrollTo(0, 0);
                              } else if (window) {
                                window.scrollTo(0, 0);
                              }
                            }}
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
                              indexPattern={indexPattern}
                              rows={rows}
                              sort={(state.sort as SortPairArr[]) || []}
                              sampleSize={opts.sampleSize}
                              searchDescription={opts.savedSearch.description}
                              searchTitle={opts.savedSearch.lastSavedTitle}
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
                              onResize={(colSettings: { columnId: string; width: number }) => {
                                const grid = { ...state.grid } || {};
                                const newColumns = { ...grid.columns } || {};
                                newColumns[colSettings.columnId] = {
                                  width: colSettings.width,
                                };
                                const newGrid = { ...grid, columns: newColumns };
                                opts.setAppState({ grid: newGrid });
                              }}
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
