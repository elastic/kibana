/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type {
  EuiContextMenuPanelItemDescriptor,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { search } from '../../../../../../../data/public';
import { AppState } from '../../services/discover_state';
import { DataCharts$, DataChartsMessage } from '../../services/use_saved_search';
import { useDataState } from '../../utils/use_data_state';

export function useChartPanels(
  state: AppState,
  savedSearchDataChart$: DataCharts$,
  toggleHideChart: () => void,
  onChangeInterval: (value: string) => void,
  closePopover: () => void
) {
  const dataState: DataChartsMessage = useDataState(savedSearchDataChart$);
  const { bucketInterval } = dataState;
  const { interval, hideChart } = state;
  const selectedOptionIdx = search.aggs.intervalOptions.findIndex((opt) => opt.val === interval);
  const intervalDisplay =
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
          timeInterval: intervalDisplay,
        },
      }),
      icon: bucketInterval?.scaled ? 'alert' : '',
      toolTipTitle: bucketInterval?.scaled
        ? i18n.translate('discover.timeIntervalWithValueWarning', {
            defaultMessage: 'Warning',
          })
        : '',
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

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: i18n.translate('discover.chartOptions', {
        defaultMessage: 'Chart options',
      }),
      items: mainPanelItems,
    },
  ];
  if (!hideChart) {
    panels.push({
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
    });
  }
  return panels;
}
