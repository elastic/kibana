/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import moment from 'moment';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPopover,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HitsCounter } from '../hits_counter';
import { search } from '../../../../../../../data/public';
import { TimechartHeader } from '../timechart_header';
import { SavedSearch } from '../../../../../saved_searches';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { DiscoverHistogram } from './histogram';
import { DataCharts$, DataChartsMessage, DataTotalHits$ } from '../../services/use_saved_search';
import { DiscoverServices } from '../../../../../build_services';
import { useDataState } from '../../utils/use_data_state';
import { TimechartBucketInterval } from '../timechart_header/timechart_header';

const TimechartHeaderMemoized = memo(TimechartHeader);
const DiscoverHistogramMemoized = memo(DiscoverHistogram);
function getPanels(
  interval: string | undefined,
  hideChart: boolean | undefined,
  toggleHideChart: () => void,
  onChangeInterval: (val: string) => void,
  closePopover: () => void,
  bucketInterval: TimechartBucketInterval | undefined
) {
  const selectedOptionIdx = search.aggs.intervalOptions.findIndex((opt) => opt.val === interval);
  const interValDisplay =
    selectedOptionIdx > -1
      ? search.aggs.intervalOptions[selectedOptionIdx].display
      : search.aggs.intervalOptions[0].display;

  const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: !hideChart
        ? i18n.translate('discover.hideChart', {
            defaultMessage: 'Hide chart',
          })
        : i18n.translate('discover.showChart', {
            defaultMessage: 'Show chart',
          }),
      icon: !hideChart ? 'eyeClosed' : 'eye',
      onClick: () => {
        toggleHideChart();
        closePopover();
      },
      'data-test-subj': 'discoverChartToggle',
    },
  ];
  if (!hideChart) {
    mainPanelItems.push({
      name: i18n.translate('discover.timeIntervalWithValue', {
        defaultMessage: 'Time interval: {timeInterval}',
        values: {
          timeInterval: interValDisplay,
        },
      }),
      icon: bucketInterval?.scaled ? 'alert' : '',
      toolTipTitle: bucketInterval?.scaled ? 'Warning' : '',
      toolTipContent: bucketInterval?.scaled
        ? i18n.translate('discover.bucketIntervalTooltip', {
            defaultMessage:
              'This interval creates {bucketsDescription} to show in the selected time range, so it has been scaled to {bucketIntervalDescription}.',
            values: {
              bucketsDescription:
                bucketInterval!.scale && bucketInterval!.scale > 1
                  ? i18n.translate('discover.bucketIntervalTooltip.tooLargeBucketsText', {
                      defaultMessage: 'buckets that are too large',
                    })
                  : i18n.translate('discover.bucketIntervalTooltip.tooManyBucketsText', {
                      defaultMessage: 'too many buckets',
                    }),
              bucketIntervalDescription: bucketInterval?.description,
            },
          })
        : '',
      panel: 1,
      'data-test-subj': 'discoverTimeIntervalPanel',
    });
  }

  return [
    {
      id: 0,
      title: i18n.translate('discover.chartOptions', {
        defaultMessage: 'Chart options',
      }),
      items: mainPanelItems,
    },
    {
      id: 1,
      initialFocusedItemIndex: selectedOptionIdx > -1 ? selectedOptionIdx : 0,
      title: i18n.translate('discover.timeIntervals', {
        defaultMessage: 'Time intervals',
      }),
      items: search.aggs.intervalOptions
        .filter(({ val }) => val !== 'custom')
        .map(({ display, val }) => {
          return {
            name: display,
            label: display,
            icon: val === interval ? 'check' : 'empty',
            onClick: () => {
              onChangeInterval(val);
              closePopover();
            },
            'data-test-subj': `discoverTimeInterval-${display}`,
            className: val === interval ? 'discoverIntervalSelected' : '',
          };
        }),
    },
  ];
}

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
  const [isPopoverOpen, setPopover] = useState(false);
  const dataState: DataChartsMessage = useDataState(savedSearchDataChart$);
  const { bucketInterval } = dataState;

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };
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
  const panels = getPanels(
    state.interval,
    state.hideChart,
    toggleHideChart,
    onChangeInterval,
    () => setPopover(false),
    bucketInterval
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
                    onClick={onButtonClick}
                    data-test-subj="discoverChartOptionsToggle"
                  >
                    {i18n.translate('discover.chartOptionsButton', {
                      defaultMessage: 'Chart options',
                    })}
                  </EuiButtonEmpty>
                }
                isOpen={isPopoverOpen}
                closePopover={closePopover}
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
