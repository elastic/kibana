/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState, useRef } from 'react';
import './discover.scss';
import classNames from 'classnames';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiHideFor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { IUiSettingsClient, MountPoint } from 'kibana/public';
import { HitsCounter } from './hits_counter';
import { TimechartHeader } from './timechart_header';
import { getServices, IndexPattern } from '../../kibana_services';
import { DiscoverUninitialized, DiscoverHistogram } from '../angular/directives';
import { DiscoverNoResults } from './no_results';
import { LoadingSpinner } from './loading_spinner/loading_spinner';
import { DocTableLegacy } from '../angular/doc_table/create_doc_table_react';
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
import { DiscoverSidebarResponsive } from './sidebar';
import { DocViewFilterFn, ElasticSearchHit } from '../doc_views/doc_views_types';

export interface DiscoverProps {
  addColumn: (column: string) => void;
  fetch: () => void;
  fetchCounter: number;
  fetchError: Error;
  fieldCounts: Record<string, number>;
  histogramData: Chart;
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
  const scrollableMobile = useRef<HTMLDivElement>(null);
  const collapseIcon = useRef<HTMLDivElement>(null);
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
  const sidebarClassName = classNames({
    closed: isSidebarClosed,
  });

  return (
    <I18nProvider>
      <div className="dscAppContainer" data-fetch-counter={fetchCounter}>
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
        <main className="dscApp__frame" ref={scrollableMobile} aria-describedby="savedSearchTitle">
          <h1 id="savedSearchTitle" className="euiScreenReaderOnly">
            {savedSearch.title}
          </h1>
          <DiscoverSidebarResponsive
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
            sidebarClassName={sidebarClassName}
            trackUiMetric={trackUiMetric}
          />
          <EuiHideFor sizes={['xs', 's']}>
            <span ref={collapseIcon}>
              <EuiButtonIcon
                iconType={isSidebarClosed ? 'menuRight' : 'menuLeft'}
                iconSize="m"
                size="s"
                onClick={() => setIsSidebarClosed(!isSidebarClosed)}
                data-test-subj="collapseSideBarButton"
                aria-controls="discover-sidebar"
                aria-expanded={isSidebarClosed ? 'false' : 'true'}
                aria-label="Toggle sidebar"
                className={`dscCollapsibleSidebar__collapseButton ${sidebarClassName}`}
              />
            </span>
          </EuiHideFor>
          <div className="dscWrapper__content">
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
              <>
                <div className="dscResultCount">
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
                    <EuiFlexItem className="dscResultCount__toggle" grow={false}>
                      <EuiButtonEmpty
                        iconType={toggleOn ? 'eyeClosed' : 'eye'}
                        onClick={() => {
                          toggleChart(!toggleOn);
                        }}
                      >
                        {toggleOn ? 'Hide chart' : 'Show chart'}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
                <SkipBottomButton onClick={onSkipBottomButtonClick} />
                {toggleOn && opts.timefield && (
                  <section
                    aria-label={i18n.translate('discover.histogramOfFoundDocumentsAriaLabel', {
                      defaultMessage: 'Histogram of found documents',
                    })}
                    className="dscTimechart"
                  >
                    {opts.chartAggConfigs && rows.length !== 0 && (
                      <div className="dscHistogram" data-test-subj="discoverChart">
                        <DiscoverHistogram
                          chartData={histogramData}
                          timefilterUpdateHandler={timefilterUpdateHandler}
                        />
                      </div>
                    )}
                  </section>
                )}

                <div className="dscResults">
                  <section
                    className="dscTable dscTableFixedScroll"
                    aria-labelledby="documentsAriaLabel"
                    ref={scrollableDesktop}
                  >
                    <h2 className="euiScreenReaderOnly" id="documentsAriaLabel">
                      <FormattedMessage
                        id="discover.documentsAriaLabel"
                        defaultMessage="Documents"
                      />
                    </h2>
                    {rows && rows.length && (
                      <div className="dscDiscover">
                        <DocTableLegacy
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
                        <span tabIndex={-1} id="discoverBottomMarker">
                          &#8203;
                        </span>
                        {rows.length === opts.sampleSize && (
                          <div className="dscTable__footer" data-test-subj="discoverDocTableFooter">
                            <FormattedMessage
                              id="discover.howToSeeOtherMatchingDocumentsDescription"
                              defaultMessage="These are the first {sampleSize} documents matching
                  your search, refine your search to see others."
                              values={{ sampleSize: opts.sampleSize }}
                            />

                            <EuiButtonEmpty
                              onClick={() => {
                                const skipToBottomBtn = document.getElementById('dscSkipButton');
                                if (skipToBottomBtn) {
                                  skipToBottomBtn.focus();
                                }
                                // depending on screen size there are different elements to scroll
                                if (!isMobile() && scrollableDesktop.current) {
                                  scrollableDesktop.current.scrollTo(0, 0);
                                }
                                if (isMobile() && scrollableMobile.current) {
                                  scrollableMobile.current.scrollTo(0, 0);
                                }
                              }}
                            >
                              <FormattedMessage
                                id="discover.backToTopLinkText"
                                defaultMessage="Back to top."
                              />
                            </EuiButtonEmpty>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
