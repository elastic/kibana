/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './last_value_time_range_mode_label.scss';

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexItem, EuiText, EuiToolTip, EuiFlexGroup, EuiIcon } from '@elastic/eui';
import { getUISettings } from '../../services';
import { convertIntervalIntoUnit, isAutoInterval, isGteInterval } from './lib/get_interval';
import { createIntervalBasedFormatter } from './lib/create_interval_based_formatter';
import { PanelData } from '../../../common/types';

const lastValueFormattedMessage = i18n.translate(
  'visTypeTimeseries.dataTimeRangeModeLabel.lastValueMode',
  {
    defaultMessage: 'Last value',
  }
);

interface LastValueTimeRangeModeLabelProps {
  seriesData?: PanelData['data'];
  panelInterval: number;
  modelInterval: string;
}

export const LastValueTimeRangeModeLabel = ({
  seriesData,
  panelInterval,
  modelInterval,
}: LastValueTimeRangeModeLabelProps) => {
  const dateFormat = getUISettings().get('dateFormat');
  const scaledDataFormat = getUISettings().get('dateFormat:scaled');

  const getFormattedPanelInterval = () => {
    const interval = convertIntervalIntoUnit(panelInterval, false);
    return interval && `${interval.unitValue}${interval.unitString}`;
  };

  const getLastValueLabelWithTooltip = () => {
    const formatter = createIntervalBasedFormatter(panelInterval, scaledDataFormat, dateFormat);
    const lastBucketDate = formatter(seriesData![seriesData!.length - 1][0]);
    const formattedPanelInterval =
      (isAutoInterval(modelInterval) || isGteInterval(modelInterval)) &&
      getFormattedPanelInterval();

    const tooltipContent = (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="visTypeTimeseries.dataTimeRangeModeLabel.lastBucketDate"
            defaultMessage="Bucket: {lastBucketDate}"
            values={{ lastBucketDate }}
          />
        </EuiFlexItem>
        {formattedPanelInterval && (
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="visTypeTimeseries.dataTimeRangeModeLabel.panelInterval"
              defaultMessage="Interval: {formattedPanelInterval}"
              values={{ formattedPanelInterval }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );

    return (
      <EuiToolTip position="top" content={tooltipContent}>
        <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText className="tvbLastValueLabel" color="subdued" size="xs">
              {lastValueFormattedMessage}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="iInCircle" size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    );
  };

  return (
    <EuiFlexItem grow={false}>
      <EuiText color="default" size="xs">
        <FormattedMessage
          id="visTypeTimeseries.dataTimeRangeModeLabel.lastValueDataTimeRangeMode"
          defaultMessage="Data timerange mode: {lastValueLabel}"
          values={{
            lastValueLabel: seriesData?.length
              ? getLastValueLabelWithTooltip()
              : lastValueFormattedMessage,
          }}
        />
      </EuiText>
    </EuiFlexItem>
  );
};
