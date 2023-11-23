/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { search } from '@kbn/data-plugin/public';
import type { UnifiedHistogramChartContext } from '../types';

export interface TimeIntervalSelectorProps {
  chart: UnifiedHistogramChartContext;
  onTimeIntervalChange: (timeInterval: string) => void;
}

const TRUNCATION_PROPS = { truncation: 'middle' as const };
const SINGLE_SELECTION = { asPlainText: true };

export const TimeIntervalSelector = ({
  chart,
  onTimeIntervalChange,
}: TimeIntervalSelectorProps) => {
  const [popoverDisabled, setPopoverDisabled] = useState(false);
  const disablePopover = useCallback(() => setPopoverDisabled(true), []);
  const enablePopover = useCallback(() => setTimeout(() => setPopoverDisabled(false)), []);

  const changeTimeInterval = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const selectedOption = newOptions[0]?.name;
      if (selectedOption) {
        onTimeIntervalChange(selectedOption);
      }
    },
    [onTimeIntervalChange]
  );

  const { euiTheme } = useEuiTheme();
  const timeIntervalCss = css`
    width: 100%;
    min-width: ${euiTheme.base * 9}px;
    max-width: ${euiTheme.base * 10}px;
    &:focus-within {
      min-width: ${euiTheme.base * 12}px;
      max-width: ${euiTheme.base * 24}px;
    }
  `;

  const selectedOptionIdx = search.aggs.intervalOptions.findIndex(
    (opt) => opt.val === chart.timeInterval
  );
  const intervalDisplay =
    selectedOptionIdx > -1
      ? search.aggs.intervalOptions[selectedOptionIdx].display
      : search.aggs.intervalOptions[0].display;

  const options = search.aggs.intervalOptions
    .filter(({ val }) => val !== 'custom')
    .map(({ display, val }) => {
      return {
        name: val,
        label: display,
        // icon: val === chart.timeInterval ? 'check' : 'empty',
        // onClick: () => {
        //   onTimeIntervalChange?.(val);
        // },
        // 'data-test-subj': `unifiedHistogramTimeInterval-${display}`,
        // className: val === chart.timeInterval ? 'unifiedHistogramIntervalSelected' : '',
      };
    });

  const selectedOptions = options.filter(({ name }) => name === chart.timeInterval);

  return (
    <EuiToolTip
      position="top"
      content={
        popoverDisabled
          ? undefined
          : i18n.translate('unifiedHistogram.timeIntervalWithValue', {
              defaultMessage: 'Time interval: {timeInterval}',
              values: {
                timeInterval: intervalDisplay,
              },
            })
      }
      anchorProps={{ css: timeIntervalCss }}
    >
      <EuiComboBox
        data-test-subj="unifiedHistogramTimeIntervalSelector"
        placeholder={i18n.translate('unifiedHistogram.autoTimeIntervalPlaceholder', {
          defaultMessage: 'Auto interval',
        })}
        aria-label={i18n.translate('unifiedHistogram.timeIntervals', {
          defaultMessage: 'Time intervals',
        })}
        singleSelection={SINGLE_SELECTION}
        options={options}
        selectedOptions={selectedOptions}
        onChange={changeTimeInterval}
        truncationProps={TRUNCATION_PROPS}
        compressed
        fullWidth={true}
        onFocus={disablePopover}
        onBlur={enablePopover}
      />
    </EuiToolTip>
  );
};
