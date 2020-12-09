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
import classNames from 'classnames';
import { HitsCounter } from './hits_counter';
import { TimechartHeader } from './timechart_header';
import { getServices } from '../../kibana_services';
import { DiscoverUninitialized, DiscoverHistogram } from '../angular/directives';
import { DiscoverNoResults } from './no_results';
import { LoadingSpinner } from './loading_spinner/loading_spinner';
import { search } from '../../../../data/public';
import {
  DiscoverSidebarResponsive,
  DiscoverSidebarResponsiveProps,
} from './sidebar/discover_sidebar_responsive';
import { DiscoverProps } from './discover_legacy';
import { SortPairArr } from '../angular/doc_table/lib/get_sort';
import { DiscoverGrid, DiscoverGridProps } from './discover_grid/discover_grid';

export const SidebarMemoized = React.memo((props: DiscoverSidebarResponsiveProps) => (
  <DiscoverSidebarResponsive {...props} />
));

export const DataGridMemoized = React.memo((props: DiscoverGridProps) => (
  <DiscoverGrid {...props} />
));

export function Discover({
  fetch,
  fetchCounter,
  fetchError,
  fieldCounts,
  histogramData,
  hits,
  indexPattern,
  onAddColumn,
  onAddFilter,
  onChangeInterval,
  onRemoveColumn,
  onSetColumns,
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
  const [toggleOn, toggleChart] = useState(true);
  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const services = getServices();
  const { TopNavMenu } = services.navigation.ui;
  const { trackUiMetric } = services;
  const { savedSearch, indexPatternList, config } = opts;
  const bucketAggConfig = opts.chartAggConfigs?.aggs[1];
  const bucketInterval =
    bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
      ? bucketAggConfig.buckets?.getInterval()
      : undefined;
  const contentCentered = resultState === 'uninitialized';
  const showTimeCol = !config.get('doc_table:hideTimeColumn', false) && indexPattern.timeFieldName;
  const columns = state.columns && state.columns.length > 0 ? state.columns : ['_source'];
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
                onAddField={onAddColumn}
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
                  iconSize="m"
                  size="s"
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
                        <EuiFlexItem className="dscResultCount__toggle" grow={false}>
                          <EuiButtonEmpty
                            size="xs"
                            iconType={toggleOn ? 'eyeClosed' : 'eye'}
                            onClick={() => {
                              toggleChart(!toggleOn);
                            }}
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
                      </EuiFlexGroup>
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
                          {opts.chartAggConfigs && rows.length !== 0 && (
                            <div className="dscHistogramGrid" data-test-subj="discoverChart">
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
                          <div className="dscDiscoverGrid">
                            <DataGridMemoized
                              ariaLabelledBy="documentsAriaLabel"
                              columns={columns}
                              defaultColumns={columns[0] === '_source'}
                              indexPattern={indexPattern}
                              rows={rows}
                              sort={(state.sort as SortPairArr[]) || []}
                              sampleSize={opts.sampleSize}
                              searchDescription={opts.savedSearch.description}
                              searchTitle={opts.savedSearch.lastSavedTitle}
                              showTimeCol={Boolean(showTimeCol)}
                              services={services}
                              settings={state.grid}
                              onAddColumn={onAddColumn}
                              onFilter={onAddFilter}
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
