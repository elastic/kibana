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
import React, { useState } from 'react';
import moment from 'moment';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HitsCounter } from './hits_counter';
import { TimechartHeader } from './timechart_header';
import { DiscoverSidebar } from './sidebar';
import { getServices } from '../../kibana_services';
// @ts-ignore
import { DiscoverNoResults } from '../angular/directives/no_results';
import { DiscoverUninitialized } from '../angular/directives/uninitialized';
import { DiscoverHistogram } from '../angular/directives/histogram';
import { LoadingSpinner } from './loading_spinner/loading_spinner';
import { DiscoverFetchError } from './fetch_error/fetch_error';
import { DocTableLegacy } from '../angular/doc_table/create_doc_table_react';
import { SkipBottomButton } from './skip_bottom_button';

export function DiscoverLegacy({
  addColumn,
  bucketInterval,
  config,
  fetch,
  fetchError,
  fetchCounter,
  fieldCounts,
  getContextAppHref,
  histogramData,
  hits,
  indexPattern,
  indexPatternList,
  intervalOptions,
  onAddFilter,
  onChangeInterval,
  onRemoveColumn,
  onSetColumns,
  onSort,
  onSkipBottomButtonClick,
  opts,
  resetQuery,
  resultState,
  rows,
  screenTitle,
  searchSource,
  setIndexPattern,
  showTimeCol,
  showSaveQuery,
  state,
  timefilterUpdateHandler,
  timeRange,
  topNavMenu,
  vis,
  updateQuery,
  updateSavedQueryId,
}: any) {
  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const toMoment = function (datetime: string) {
    if (!datetime) {
      return '';
    }
    return moment(datetime).format(config.get('dateFormat'));
  };
  const { TopNavMenu } = getServices().navigation.ui;
  const { savedSearch } = opts;

  return (
    <I18nProvider>
      <div className="app-container" data-fetch-counter={fetchCounter}>
        <h1 className="euiScreenReaderOnly">{screenTitle}</h1>
        <TopNavMenu
          appName="discover"
          config={topNavMenu}
          indexPatterns={[indexPattern]}
          onQuerySubmit={updateQuery}
          onSavedQueryIdChange={updateSavedQueryId}
          query={state.query}
          savedQueryId={state.savedQuery}
          screenTitle={screenTitle}
          showDatePicker={indexPattern.isTimeBased()}
          showSaveQuery={showSaveQuery}
          showSearchBar={true}
          useDefaultBehaviors={true}
        />
        <main className="container-fluid">
          <div className="row">
            <div
              className={`col-md-2 dscSidebar__container collapsible-sidebar ${
                isSidebarClosed ? 'closed' : ''
              }`}
              id="discover-sidebar"
              data-test-subj="discover-sidebar"
            >
              <div className="dscFieldChooser">
                <DiscoverSidebar
                  columns={state.columns}
                  fieldCounts={fieldCounts}
                  hits={rows}
                  indexPatternList={indexPatternList}
                  onAddField={addColumn}
                  onAddFilter={onAddFilter}
                  onRemoveField={onRemoveColumn}
                  selectedIndexPattern={searchSource && searchSource.getField('index')}
                  setIndexPattern={setIndexPattern}
                  state={state}
                />
              </div>
              <button
                onClick={() => setIsSidebarClosed(!isSidebarClosed)}
                data-test-subj="collapseSideBarButton"
                aria-controls="discover-sidebar"
                aria-expanded="true"
                aria-label="Toggle sidebar"
                className="kuiCollapseButton kbnCollapsibleSidebar__collapseButton"
              >
                <span
                  className={`kuiIcon ${
                    isSidebarClosed ? 'fa-chevron-circle-right' : 'fa-chevron-circle-left'
                  }`}
                />
              </button>
            </div>
            <div className={`dscWrapper col-md-${isSidebarClosed ? '12' : '10'}`}>
              {resultState === 'none' && (
                <DiscoverNoResults
                  timeFieldName={opts.timefield}
                  queryLanguage={state.query.language}
                />
              )}
              {resultState === 'uninitialized' && <DiscoverUninitialized onRefresh={fetch} />}

              <span style={{ display: resultState !== 'loading' ? 'none' : '' }}>
                {fetchError && <DiscoverFetchError fetchError={fetchError} />}
                {!fetchError && (
                  <div className="dscOverlay" style={{ display: fetchError ? 'none' : '' }}>
                    <LoadingSpinner />
                  </div>
                )}
              </span>

              {resultState === 'ready' && (
                <div className="dscWrapper__content">
                  <SkipBottomButton onClick={onSkipBottomButtonClick} />
                  <HitsCounter
                    hits={hits > 0 ? hits : 0}
                    showResetButton={!!(savedSearch && savedSearch.id)}
                    onResetQuery={resetQuery}
                  />
                  {timeRange && (
                    <TimechartHeader
                      from={toMoment(timeRange.from)}
                      to={toMoment(timeRange.to)}
                      options={intervalOptions}
                      onChangeInterval={onChangeInterval}
                      stateInterval={state.interval}
                      showScaledInfo={bucketInterval.scaled}
                      bucketIntervalDescription={bucketInterval.description}
                      bucketIntervalScale={bucketInterval.scale}
                    />
                  )}

                  {opts.timefield && (
                    <section
                      aria-label="{{::'discover.histogramOfFoundDocumentsAriaLabel' | i18n: {defaultMessage: 'Histogram of found documents'} }}"
                      className="dscTimechart"
                    >
                      {vis && rows.length !== 0 && (
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
                    <section className="dscTable" aria-labelledby="documentsAriaLabel">
                      <h2 className="euiScreenReaderOnly" id="documentsAriaLabel">
                        <FormattedMessage
                          id="discover.documentsAriaLabel"
                          defaultMessage="Documents"
                        />
                      </h2>
                      {rows && rows.length && (
                        <div className="dscDiscover">
                          <DocTableLegacy
                            ariaLabelledBy="documentsAriaLabel"
                            columns={state.columns}
                            indexPattern={indexPattern}
                            rows={rows}
                            sort={state.sort}
                            sampleSize={opts.sampleSize}
                            searchDescription={opts.savedSearch.description}
                            searchTitle={opts.savedSearch.lastSavedTitle}
                            showTimeCol={showTimeCol}
                            getContextAppHref={getContextAppHref}
                            onAddColumn={addColumn}
                            onFilter={onAddFilter}
                            onRemoveColumn={onRemoveColumn}
                            onSetColumns={onSetColumns}
                            onSort={onSort}
                          />
                          <a tabIndex={0} id="discoverBottomMarker">
                            &#8203;
                          </a>
                          {rows.length === opts.sampleSize && (
                            <div
                              className="dscTable__footer"
                              data-test-subj="discoverDocTableFooter"
                            >
                              <FormattedMessage
                                id="discover.howToSeeOtherMatchingDocumentsDescription"
                                defaultMessage="These are the first {sampleSize} documents matching
                  your search, refine your search to see others."
                                values={{ sampleSize: opts.sampleSize }}
                              />

                              <EuiButtonEmpty onClick={() => window.scrollTo(0, 0)}>
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
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
