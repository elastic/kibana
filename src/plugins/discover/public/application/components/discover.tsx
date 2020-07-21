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
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HitsCounter } from './hits_counter';
import { DiscoverGrid } from './discover_grid/discover_grid';
import { TimechartHeader } from './timechart_header';
import { DiscoverSidebar } from './sidebar';
import { getServices } from '../../kibana_services';
// @ts-ignore
import { DiscoverNoResults } from '../angular/directives/no_results';
import { DiscoverUninitialized } from '../angular/directives/uninitialized';
import { DiscoverHistogram } from '../angular/directives/histogram';
import { LoadingSpinner } from './loading_spinner/loading_spinner';
import { DiscoverFetchError } from './fetch_error/fetch_error';
import { EuiFlexItem, EuiFlexGroup, EuiButtonToggle } from '@elastic/eui';

export function Discover({
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
  const toMoment = function (datetime: string) {
    if (!datetime) {
      return '';
    }
    return moment(datetime).format(config.get('dateFormat'));
  };
  if (!timeRange) {
    return <div>Loading</div>;
  }
  const { TopNavMenu } = getServices().navigation.ui;
  const { savedSearch } = opts;
  const [toggle4On, setToggle4On] = useState(true);

  const onToggle4Change = (e) => {
    setToggle4On(e.target.checked);
  };

  return (
    <I18nProvider>
      <div className="dscApp" data-fetch-counter={fetchCounter}>
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

        <main className="dscApp__frame">
          <div className="dscApp__sidebar">
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
          <div className="dscApp__content">
            {resultState === 'none' && (
              <DiscoverNoResults
                timeFieldName={opts.timefield}
                queryLanguage={state.query.language}
              />
            )}
            {resultState === 'uninitialized' && <DiscoverUninitialized onRefresh={fetch} />}

            {resultState === 'loading' && (
              <>
                {fetchError && <DiscoverFetchError fetchError={fetchError} />}
                {!fetchError && (
                  <div className="dscOverlay">
                    <LoadingSpinner />
                  </div>
                )}
              </>
            )}

            {resultState === 'ready' && (
              <div className="dscWrapper__content">
                <div className="dscResultCount">
                  <EuiFlexGroup justifyContent="spaceBetween">
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
                    <EuiFlexItem className="dscResultCount__actions eui-textTruncate eui-textNoWrap">
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
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonToggle
                        label={toggle4On ? 'Hide chart' : 'Show chart'}
                        iconType={toggle4On ? 'eyeClosed' : 'eye'}
                        onChange={onToggle4Change}
                        isSelected={toggle4On}
                        isEmpty
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
                <div className="dscResults">
                  {opts.timefield && toggle4On && (
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
                  <section className="dscTable" aria-labelledby="documentsAriaLabel">
                    <h2 className="euiScreenReaderOnly" id="documentsAriaLabel">
                      <FormattedMessage
                        id="discover.documentsAriaLabel"
                        defaultMessage="Documents"
                      />
                    </h2>
                    {rows && rows.length && (
                      <div className="dscDiscoverGrid">
                        <DiscoverGrid
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
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
