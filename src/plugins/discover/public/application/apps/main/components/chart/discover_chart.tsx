/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback } from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { IUiSettingsClient } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { HitsCounter } from '../hits_counter';
import { DataPublicPluginStart, IndexPattern, search } from '../../../../../../../data/public';
import { TimechartHeader } from '../timechart_header';
import { SavedSearch } from '../../../../../saved_searches';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { TimechartBucketInterval } from '../timechart_header/timechart_header';
import { Chart as IChart } from './point_series';
import { DiscoverHistogram } from './histogram';

const TimechartHeaderMemoized = React.memo(TimechartHeader);
const DiscoverHistogramMemoized = React.memo(DiscoverHistogram);
export function DiscoverChart({
  config,
  data,
  bucketInterval,
  chartData,
  hits,
  isLegacy,
  resetQuery,
  savedSearch,
  state,
  stateContainer,
  timefield,
}: {
  config: IUiSettingsClient;
  data: DataPublicPluginStart;
  bucketInterval: TimechartBucketInterval;
  chartData?: IChart;
  hits: number;
  indexPattern: IndexPattern;
  isLegacy: boolean;
  resetQuery: () => void;
  savedSearch: SavedSearch;
  state: AppState;
  stateContainer: GetStateReturn;
  timefield?: string;
}) {
  const toggleHideChart = useCallback(() => {
    stateContainer.setAppState({ hideChart: !state.hideChart });
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
              hits={hits}
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
                bucketInterval={bucketInterval}
              />
            </EuiFlexItem>
          )}
          {timefield && (
            <EuiFlexItem className="dscResultCount__toggle" grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType={!state.hideChart ? 'eyeClosed' : 'eye'}
                onClick={() => {
                  toggleHideChart();
                }}
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
      {!state.hideChart && chartData && (
        <EuiFlexItem grow={false}>
          <section
            aria-label={i18n.translate('discover.histogramOfFoundDocumentsAriaLabel', {
              defaultMessage: 'Histogram of found documents',
            })}
            className="dscTimechart"
          >
            <div
              className={isLegacy ? 'dscHistogram' : 'dscHistogramGrid'}
              data-test-subj="discoverChart"
            >
              <DiscoverHistogramMemoized
                chartData={chartData}
                timefilterUpdateHandler={timefilterUpdateHandler}
              />
            </div>
          </section>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
