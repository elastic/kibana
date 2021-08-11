/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useRef, memo } from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HitsCounter } from '../hits_counter';
import { search } from '../../../../../../../data/public';
import { TimechartHeader } from '../timechart_header';
import { SavedSearch } from '../../../../../saved_searches';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { DiscoverHistogram } from './histogram';
import { DataCharts$, DataTotalHits$ } from '../../services/use_saved_search';
import { DiscoverServices } from '../../../../../build_services';

const TimechartHeaderMemoized = memo(TimechartHeader);
const DiscoverHistogramMemoized = memo(DiscoverHistogram);
export function DiscoverChart({
  resetQuery,
  savedSearch,
  savedSearchDataChart$,
  savedSearchDataTotalHits$,
  services,
  state,
  stateContainer,
  timefield,
}: {
  resetQuery: () => void;
  savedSearch: SavedSearch;
  savedSearchDataChart$: DataCharts$;
  savedSearchDataTotalHits$: DataTotalHits$;
  services: DiscoverServices;
  state: AppState;
  stateContainer: GetStateReturn;
  timefield?: string;
}) {
  const { data, uiSettings: config } = services;
  const chartRef = useRef<{ element: HTMLElement | null; moveFocus: boolean }>({
    element: null,
    moveFocus: false,
  });

  useEffect(() => {
    if (chartRef.current.moveFocus && chartRef.current.element) {
      chartRef.current.element.focus();
    }
  }, [state.hideChart]);

  const toggleHideChart = useCallback(() => {
    const newHideChart = !state.hideChart;
    stateContainer.setAppState({ hideChart: newHideChart });
    chartRef.current.moveFocus = !newHideChart;
  }, [state, stateContainer]);

  const onChangeInterval = useCallback(
    (interval: string) => {
      if (interval) {
        stateContainer.setAppState({ interval });
      }
    },
    [stateContainer]
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

  return (
    <EuiFlexGroup direction="column" alignItems="stretch" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false} className="dscResultCount">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem
            grow={false}
            className="dscResuntCount__title eui-textTruncate eui-textNoWrap"
          >
            <HitsCounter
              savedSearchData$={savedSearchDataTotalHits$}
              showResetButton={!!(savedSearch && savedSearch.id)}
              onResetQuery={resetQuery}
            />
          </EuiFlexItem>
          {!state.hideChart && (
            <EuiFlexItem className="dscResultCount__actions">
              <TimechartHeaderMemoized
                data={data}
                dateFormat={config.get('dateFormat')}
                options={search.aggs.intervalOptions}
                onChangeInterval={onChangeInterval}
                stateInterval={state.interval || ''}
                savedSearchData$={savedSearchDataChart$}
              />
            </EuiFlexItem>
          )}
          {timefield && (
            <EuiFlexItem className="dscResultCount__toggle" grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType={!state.hideChart ? 'eyeClosed' : 'eye'}
                onClick={toggleHideChart}
                data-test-subj="discoverChartToggle"
              >
                {!state.hideChart
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
      </EuiFlexItem>
      {timefield && !state.hideChart && (
        <EuiFlexItem grow={false}>
          <section
            ref={(element) => (chartRef.current.element = element)}
            tabIndex={-1}
            aria-label={i18n.translate('discover.histogramOfFoundDocumentsAriaLabel', {
              defaultMessage: 'Histogram of found documents',
            })}
            className="dscTimechart"
          >
            <div className="dscHistogram" data-test-subj="discoverChart">
              <DiscoverHistogramMemoized
                savedSearchData$={savedSearchDataChart$}
                timefilterUpdateHandler={timefilterUpdateHandler}
                services={services}
              />
            </div>
          </section>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
