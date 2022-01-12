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
import { search } from '../../../../../../data/public';

export function useChartPanels(
  toggleHideChart: () => void,
  onChangeInterval: (value: string) => void,
  closePopover: () => void,
  hideChartState?: boolean,
  interval?: string
) {
  const selectedOptionIdx = search.aggs.intervalOptions.findIndex((opt) => opt.val === interval);
  const intervalDisplay =
    selectedOptionIdx > -1
      ? search.aggs.intervalOptions[selectedOptionIdx].display
      : search.aggs.intervalOptions[0].display;

  const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: !hideChartState
        ? i18n.translate('discover.hideChart', {
            defaultMessage: 'Hide chart',
          })
        : i18n.translate('discover.showChart', {
            defaultMessage: 'Show chart',
          }),
      icon: !hideChartState ? 'eyeClosed' : 'eye',
      onClick: () => {
        toggleHideChart();
        closePopover();
      },
      'data-test-subj': 'discoverChartToggle',
    },
  ];
  if (!hideChartState) {
    mainPanelItems.push({
      name: i18n.translate('discover.timeIntervalWithValue', {
        defaultMessage: 'Time interval: {timeInterval}',
        values: {
          timeInterval: intervalDisplay,
        },
      }),
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
  if (!hideChartState) {
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
