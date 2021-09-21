/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import moment from 'moment';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HitsCounter } from '../hits_counter';
import { TimechartHeader } from '../timechart_header';
import { SavedSearch } from '../../../../../saved_searches';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { DiscoverHistogram } from './histogram';
import { DataCharts$, DataTotalHits$ } from '../../services/use_saved_search';
import { DiscoverServices } from '../../../../../build_services';
import { useChartPanels } from './use_chart_panels';

const TimechartHeaderMemoized = memo(TimechartHeader);
const DiscoverHistogramMemoized = memo(DiscoverHistogram);

export function DiscoverChart({
  resetSavedSearch,
  savedSearch,
  savedSearchDataChart$,
  savedSearchDataTotalHits$,
  services,
  state,
  stateContainer,
  timefield,
}: {
  resetSavedSearch: () => void;
  savedSearch: SavedSearch;
  savedSearchDataChart$: DataCharts$;
  savedSearchDataTotalHits$: DataTotalHits$;
  services: DiscoverServices;
  state: AppState;
  stateContainer: GetStateReturn;
  timefield?: string;
}) {
  const [areChartOptionVisible, setChartOptionsVisible] = useState(false);

  const { data, uiSettings: config } = services;
  const chartRef = useRef<{ element: HTMLElement | null; moveFocus: boolean }>({
    element: null,
    moveFocus: false,
  });

  const onShowChartOptions = useCallback(() => {
    setChartOptionsVisible(!areChartOptionVisible);
  }, [areChartOptionVisible]);

  const closeChartOptions = useCallback(() => {
    setChartOptionsVisible(false);
  }, [setChartOptionsVisible]);

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
  const panels = useChartPanels(
    state,
    savedSearchDataChart$,
    toggleHideChart,
    (interval) => stateContainer.setAppState({ interval }),
    () => setChartOptionsVisible(false)
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
              onResetQuery={resetSavedSearch}
            />
          </EuiFlexItem>
          {!state.hideChart && (
            <EuiFlexItem className="dscResultCount__actions">
              <TimechartHeaderMemoized
                data={data}
                dateFormat={config.get('dateFormat')}
                stateInterval={state.interval || ''}
                savedSearchData$={savedSearchDataChart$}
              />
            </EuiFlexItem>
          )}
          {timefield && (
            <EuiFlexItem className="dscResultCount__toggle" grow={false}>
              <EuiPopover
                id="contextMenuExample"
                button={
                  <EuiButtonEmpty
                    size="xs"
                    iconType={'gear'}
                    onClick={onShowChartOptions}
                    data-test-subj="discoverChartOptionsToggle"
                  >
                    {i18n.translate('discover.chartOptionsButton', {
                      defaultMessage: 'Chart options',
                    })}
                  </EuiButtonEmpty>
                }
                isOpen={areChartOptionVisible}
                closePopover={closeChartOptions}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenu initialPanelId={0} panels={panels} />
              </EuiPopover>
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
