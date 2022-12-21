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
import { search } from '@kbn/data-plugin/public';
import type { UnifiedHistogramChartContext } from '../types';

export function useChartPanels({
  chart,
  toggleHideChart,
  onTimeIntervalChange,
  closePopover,
  onResetChartHeight,
}: {
  chart?: UnifiedHistogramChartContext;
  toggleHideChart: () => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
  closePopover: () => void;
  onResetChartHeight?: () => void;
}) {
  if (!chart) {
    return [];
  }

  const selectedOptionIdx = search.aggs.intervalOptions.findIndex(
    (opt) => opt.val === chart.timeInterval
  );
  const intervalDisplay =
    selectedOptionIdx > -1
      ? search.aggs.intervalOptions[selectedOptionIdx].display
      : search.aggs.intervalOptions[0].display;

  const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: !chart.hidden
        ? i18n.translate('unifiedHistogram.hideChart', {
            defaultMessage: 'Hide chart',
          })
        : i18n.translate('unifiedHistogram.showChart', {
            defaultMessage: 'Show chart',
          }),
      icon: !chart.hidden ? 'eyeClosed' : 'eye',
      onClick: () => {
        toggleHideChart();
        closePopover();
      },
      'data-test-subj': 'unifiedHistogramChartToggle',
    },
  ];
  if (!chart.hidden) {
    if (onResetChartHeight) {
      mainPanelItems.push({
        name: i18n.translate('unifiedHistogram.resetChartHeight', {
          defaultMessage: 'Reset to default height',
        }),
        icon: 'refresh',
        onClick: () => {
          onResetChartHeight();
          closePopover();
        },
        'data-test-subj': 'unifiedHistogramChartResetHeight',
      });
    }

    mainPanelItems.push({
      name: i18n.translate('unifiedHistogram.timeIntervalWithValue', {
        defaultMessage: 'Time interval: {timeInterval}',
        values: {
          timeInterval: intervalDisplay,
        },
      }),
      panel: 1,
      'data-test-subj': 'unifiedHistogramTimeIntervalPanel',
    });
  }

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: i18n.translate('unifiedHistogram.chartOptions', {
        defaultMessage: 'Chart options',
      }),
      items: mainPanelItems,
    },
  ];
  if (!chart.hidden) {
    panels.push({
      id: 1,
      initialFocusedItemIndex: selectedOptionIdx > -1 ? selectedOptionIdx : 0,
      title: i18n.translate('unifiedHistogram.timeIntervals', {
        defaultMessage: 'Time intervals',
      }),
      items: search.aggs.intervalOptions
        .filter(({ val }) => val !== 'custom')
        .map(({ display, val }) => {
          return {
            name: display,
            label: display,
            icon: val === chart.timeInterval ? 'check' : 'empty',
            onClick: () => {
              onTimeIntervalChange?.(val);
              closePopover();
            },
            'data-test-subj': `unifiedHistogramTimeInterval-${display}`,
            className: val === chart.timeInterval ? 'unifiedHistogramIntervalSelected' : '',
          };
        }),
    });
  }
  return panels;
}
