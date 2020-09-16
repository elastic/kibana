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
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import rison from 'rison-node';
// import { EuiResizableContainer } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import {
  EuiBadge,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiButtonToggle,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
} from '@elastic/eui';
import { HitsCounter } from './hits_counter';
import { DiscoverGrid } from './discover_grid/discover_grid';
import { TimechartHeader } from './timechart_header';
import { DiscoverSidebar } from './sidebar';
import { DiscoverSidebarMobile } from './sidebar';
import { DiscoverMobileFlyout } from './sidebar';
import { getServices } from '../../kibana_services';

// @ts-ignore
import { DiscoverNoResults } from '../angular/directives/no_results';
import { DiscoverUninitialized } from '../angular/directives/uninitialized';
import { DiscoverHistogram } from '../angular/directives/histogram';
import { LoadingSpinner } from './loading_spinner/loading_spinner';
import { DiscoverFetchError } from './fetch_error/fetch_error';
import './discover.scss';
import { esFilters } from '../../../../data/public';

// Hook
function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  return windowSize;
}

export function Discover({
  addColumn,
  bucketInterval,
  config,
  fetch,
  fetchError,
  fetchCounter,
  fieldCounts,
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
  onResize,
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
  const [toggleOn, toggleChart] = useState(true);
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
  const { savedSearch, filterManager } = opts;
  const size = useWindowSize();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout onClose={() => setIsFlyoutVisible(false)} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <h2 id="flyoutTitle">Field list</h2>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <DiscoverMobileFlyout
            columns={state.columns}
            fieldCounts={fieldCounts}
            hits={rows}
            indexPatternList={indexPatternList}
            onAddField={addColumn}
            onAddFilter={onAddFilter}
            onRemoveField={onRemoveColumn}
            selectedIndexPattern={searchSource && searchSource.getField('index')}
            setIndexPattern={setIndexPattern}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  const getContextAppHref = (anchorId: string) => {
    const path = `#/context/${encodeURIComponent(indexPattern.id)}/${encodeURIComponent(anchorId)}`;
    const urlSearchParams = new URLSearchParams();

    urlSearchParams.set(
      'g',
      rison.encode({
        filters: filterManager.getGlobalFilters() || [],
      })
    );

    urlSearchParams.set(
      '_a',
      rison.encode({
        columns: state.columns,
        filters: (filterManager.getAppFilters() || []).map(esFilters.disableFilter),
      })
    );
    return `${path}?${urlSearchParams.toString()}`;
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
          <>
            {flyout}
            {size && size.width > 575 ? (
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
              />
            ) : (
              <div className="dscSidebar__mobile">
                <DiscoverSidebarMobile
                  columns={state.columns}
                  fieldCounts={fieldCounts}
                  hits={rows}
                  indexPatternList={indexPatternList}
                  onAddField={addColumn}
                  onAddFilter={onAddFilter}
                  onRemoveField={onRemoveColumn}
                  selectedIndexPattern={searchSource && searchSource.getField('index')}
                  setIndexPattern={setIndexPattern}
                />
                <EuiButton fullWidth onClick={() => setIsFlyoutVisible(true)}>
                  <EuiFlexGroup responsive={false}>
                    <EuiFlexItem grow={1}>Fields</EuiFlexItem>
                    <EuiFlexItem grow={false}>Selected</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="accent">5</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="arrowUp">5</EuiIcon>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiButton>
              </div>
            )}

            <>
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
                  {size.width}px / {size.height}px
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
                      <EuiFlexItem className="dscResultCount__actions">
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
                      <EuiFlexItem className="dscResultCount__toggle" grow={false}>
                        <EuiButtonToggle
                          label={toggleOn ? 'Hide chart' : 'Show chart'}
                          iconType={toggleOn ? 'eyeClosed' : 'eye'}
                          onChange={(e: any) => {
                            toggleChart(e.target.checked);
                          }}
                          isSelected={toggleOn}
                          isEmpty
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                  <div className="dscResults">
                    {opts.timefield && toggleOn && (
                      <section
                        aria-label="{{::'discover.histogramOfFoundDocumentsAriaLabel' | i18n: {defaultMessage: 'Histogram of found documents'} }}"
                        className="dscTimechart"
                      >
                        {vis && rows.length !== 0 && (
                          <div className="dscHistogramGrid" data-test-subj="discoverChart">
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
                            columnsWidth={state.columnsWidth}
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
                            onResize={onResize}
                          />
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </>
          </>
        </main>
      </div>
    </I18nProvider>
  );
}
