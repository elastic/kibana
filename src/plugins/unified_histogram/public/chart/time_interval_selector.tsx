/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { search } from '@kbn/data-plugin/public';
import type { UnifiedHistogramChartContext } from '../types';
import { ToolbarSelector, ToolbarSelectorProps, SelectableEntry } from './toolbar_selector';

export interface TimeIntervalSelectorProps {
  chart: UnifiedHistogramChartContext;
  onTimeIntervalChange: (timeInterval: string) => void;
}

export const TimeIntervalSelector: React.FC<TimeIntervalSelectorProps> = ({
  chart,
  onTimeIntervalChange,
}) => {
  const onChange: ToolbarSelectorProps['onChange'] = useCallback(
    (chosenOption) => {
      const selectedOption = chosenOption?.value;
      if (selectedOption) {
        onTimeIntervalChange(selectedOption);
      }
    },
    [onTimeIntervalChange]
  );

  const selectedOptionIdx = search.aggs.intervalOptions.findIndex(
    (opt) => opt.val === chart.timeInterval
  );
  const intervalDisplay =
    selectedOptionIdx > -1
      ? search.aggs.intervalOptions[selectedOptionIdx].display
      : search.aggs.intervalOptions[0].display;

  const options: SelectableEntry[] = search.aggs.intervalOptions
    .filter(({ val }) => val !== 'custom')
    .map(({ display, val }) => {
      return {
        key: val,
        value: val,
        label: display,
        checked: val === chart.timeInterval ? ('on' as EuiSelectableOption['checked']) : undefined,
      };
    });

  return (
    <ToolbarSelector
      data-test-subj="unifiedHistogramTimeIntervalSelector"
      data-selected-value={chart.timeInterval}
      searchable={false}
      buttonLabel={
        chart.timeInterval !== 'auto'
          ? i18n.translate('unifiedHistogram.timeIntervalSelector.buttonLabel', {
              defaultMessage: `Interval: {timeInterval}`,
              values: {
                timeInterval: intervalDisplay.toLowerCase(),
              },
            })
          : i18n.translate('unifiedHistogram.timeIntervalSelector.autoIntervalButtonLabel', {
              defaultMessage: 'Auto interval',
            })
      }
      popoverTitle={i18n.translate(
        'unifiedHistogram.timeIntervalSelector.timeIntervalPopoverTitle',
        {
          defaultMessage: 'Select time interval',
        }
      )}
      options={options}
      onChange={onChange}
    />
  );
};
