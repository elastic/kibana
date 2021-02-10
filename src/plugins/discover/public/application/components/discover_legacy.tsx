/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover.scss';

import React, { useState, useRef } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { IUiSettingsClient, MountPoint } from 'kibana/public';
import classNames from 'classnames';
import { HitsCounter } from './hits_counter';
import { TimechartHeader } from './timechart_header';
import { getServices, IndexPattern } from '../../kibana_services';
import { DiscoverUninitialized, DiscoverHistogram } from '../angular/directives';
import { DiscoverNoResults } from './no_results';
import { LoadingSpinner } from './loading_spinner/loading_spinner';
import { DocTableLegacy, DocTableLegacyProps } from '../angular/doc_table/create_doc_table_react';
import { SkipBottomButton } from './skip_bottom_button';
import {
  search,
  ISearchSource,
  TimeRange,
  Query,
  IndexPatternAttributes,
  DataPublicPluginStart,
  AggConfigs,
  FilterManager,
} from '../../../../data/public';
import { Chart } from '../angular/helpers/point_series';
import { AppState } from '../angular/discover_state';
import { SavedSearch } from '../../saved_searches';
import { SavedObject } from '../../../../../core/types';
import { TopNavMenuData } from '../../../../navigation/public';
import {
  DiscoverSidebarResponsive,
  DiscoverSidebarResponsiveProps,
} from './sidebar/discover_sidebar_responsive';
import { DocViewFilterFn, ElasticSearchHit } from '../doc_views/doc_views_types';

export interface DiscoverProps {
  addColumn: (column: string) => void;
  fetch: () => void;
  fetchCounter: number;
  fetchError?: Error;
  fieldCounts: Record<string, number>;
  histogramData?: Chart;
  hits: number;
  indexPattern: IndexPattern;
  minimumVisibleRows: number;
  onAddFilter: DocViewFilterFn;
  onChangeInterval: (interval: string) => void;
  onMoveColumn: (columns: string, newIdx: number) => void;
  onRemoveColumn: (column: string) => void;
  onSetColumns: (columns: string[]) => void;
  onSkipBottomButtonClick: () => void;
  onSort: (sort: string[][]) => void;
  opts: {
    chartAggConfigs?: AggConfigs;
    config: IUiSettingsClient;
    data: DataPublicPluginStart;
    fixedScroll: (el: HTMLElement) => void;
    filterManager: FilterManager;
    indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
    sampleSize: number;
    savedSearch: SavedSearch;
    setHeaderActionMenu: (menuMount: MountPoint | undefined) => void;
    timefield: string;
    setAppState: (state: Partial<AppState>) => void;
  };
  resetQuery: () => void;
  resultState: string;
  rows: ElasticSearchHit[];
  searchSource: ISearchSource;
  setIndexPattern: (id: string) => void;
  showSaveQuery: boolean;
  state: AppState;
  timefilterUpdateHandler: (ranges: { from: number; to: number }) => void;
  timeRange?: { from: string; to: string };
  topNavMenu: TopNavMenuData[];
  updateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  updateSavedQueryId: (savedQueryId?: string) => void;
}

export const DocTableLegacyMemoized = React.memo((props: DocTableLegacyProps) => (
  <DocTableLegacy {...props} />
));
export const SidebarMemoized = React.memo((props: DiscoverSidebarResponsiveProps) => (
  <DiscoverSidebarResponsive {...props} />
));

export function DiscoverLegacy({
  addColumn,
  fetch,
  fetchCounter,
  fieldCounts,
  fetchError,
  histogramData,
  hits,
  indexPattern,
  minimumVisibleRows,
  onAddFilter,
  onChangeInterval,
  onMoveColumn,
  onRemoveColumn,
  onSkipBottomButtonClick,
  onSort,
  opts,
  resetQuery,
  resultState,
  rows,
  searchSource,
  setIndexPattern,
  showSaveQuery,
  state,
  timefilterUpdateHandler,
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
  const { trackUiMetric } = services;
  const { savedSearch, indexPatternList } = opts;
  const bucketAggConfig = opts.chartAggConfigs?.aggs[1];
  const bucketInterval =
    bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
      ? bucketAggConfig.buckets?.getInterval()
      : undefined;
  const contentCentered = resultState === 'uninitialized';

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
          showSaveQuery={showSaveQuery}
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
                onAddField={addColumn}
                onAddFilter={onAddFilter}
                onRemoveField={onRemoveColumn}
                selectedIndexPattern={searchSource && searchSource.getField('index')}
                services={services}
                setIndexPattern={setIndexPattern}
                isClosed={isSidebarClosed}
                trackUiMetric={trackUiMetric}
              />
            </EuiFlexItem>
            <EuiHideFor sizes={['xs', 's']}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType={isSidebarClosed ? 'menuRight' : 'menuLeft'}
                  onClick={() => setIsSidebarClosed(!isSidebarClosed)}
                  data-test-subj="collapseSideBarButton"
                  aria-controls="discover-sidebar"
                  aria-expanded={isSidebarClosed ? 'false' : 'true'}
                  aria-label="Toggle sidebar"
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
                    queryLanguage={state.query ? state.query.language : ''}
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
                      <SkipBottomButton onClick={onSkipBottomButtonClick} />
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
                          {opts.chartAggConfigs && rows.length !== 0 && histogramData && (
                            <div className="dscHistogram" data-test-subj="discoverChart">
                              <DiscoverHistogram
                                chartData={histogramData}
                                timefilterUpdateHandler={timefilterUpdateHandler}
                              />
                            </div>
                          )}
                        </section>
                      </EuiFlexItem>
                    )}

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
                        {rows && rows.length && (
                          <div>
                            <DocTableLegacyMemoized
                              columns={state.columns || []}
                              indexPattern={indexPattern}
                              minimumVisibleRows={minimumVisibleRows}
                              rows={rows}
                              sort={state.sort || []}
                              searchDescription={opts.savedSearch.description}
                              searchTitle={opts.savedSearch.lastSavedTitle}
                              onAddColumn={addColumn}
                              onFilter={onAddFilter}
                              onMoveColumn={onMoveColumn}
                              onRemoveColumn={onRemoveColumn}
                              onSort={onSort}
                            />
                            {rows.length === opts.sampleSize ? (
                              <div
                                className="dscTable__footer"
                                data-test-subj="discoverDocTableFooter"
                                tabIndex={-1}
                                id="discoverBottomMarker"
                              >
                                <FormattedMessage
                                  id="discover.howToSeeOtherMatchingDocumentsDescription"
                                  defaultMessage="These are the first {sampleSize} documents matching
                  your search, refine your search to see others."
                                  values={{ sampleSize: opts.sampleSize }}
                                />

                                <EuiButtonEmpty
                                  onClick={() => {
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
                                >
                                  <FormattedMessage
                                    id="discover.backToTopLinkText"
                                    defaultMessage="Back to top."
                                  />
                                </EuiButtonEmpty>
                              </div>
                            ) : (
                              <span tabIndex={-1} id="discoverBottomMarker">
                                &#8203;
                              </span>
                            )}
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
