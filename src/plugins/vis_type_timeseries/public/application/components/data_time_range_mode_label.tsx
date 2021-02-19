/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexItem, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { getUISettings } from '../../services';
import { convertIntervalIntoUnit, isAutoInterval, isGteInterval } from './lib/get_interval';
import { createIntervalBasedFormatter } from '../components/lib/create_interval_based_formatter';
import { TIME_RANGE_DATA_MODES } from '../../../common/timerange_data_modes';

const lastValueFormattedMessage = (
  <FormattedMessage
    id="visTypeTimeseries.dataTimeRangeModeLabel.lastValueMode"
    defaultMessage="Last value"
  />
);

interface DataTimeRangeModeLabelProps {
  seriesData: Array<Array<number | null>>;
  panelInterval: number;
  modelInterval: string;
  modelTimeRangeMode: TIME_RANGE_DATA_MODES;
}

export const DataTimeRangeModeLabel = ({
  seriesData,
  panelInterval,
  modelInterval,
  modelTimeRangeMode,
}: DataTimeRangeModeLabelProps) => {
  const hasShowPanelIntervalValue = () =>
    isAutoInterval(modelInterval) || isGteInterval(modelInterval);

  const getFormattedPanelInterval = () => {
    const interval = convertIntervalIntoUnit(panelInterval, false);
    return interval && `${interval.unitValue}${interval.unitString}`;
  };

  const getLastValueLabelWithTooltip = () => {
    const dateFormat = getUISettings().get('dateFormat');
    const scaledDataFormat = getUISettings().get('dateFormat:scaled');
    const formatter = createIntervalBasedFormatter(panelInterval, scaledDataFormat, dateFormat);

    const lastBucketDate = formatter(seriesData[seriesData.length - 1][0]);
    const formattedPanelInterval = hasShowPanelIntervalValue() && getFormattedPanelInterval();
    const tooltipContent = (
      <FormattedMessage
        id="visTypeTimeseries.dataTimeRangeModeLabel.lastValueTooltip"
        defaultMessage="Bucket: {bucket} {interval}"
        values={{
          bucket: lastBucketDate,
          interval: formattedPanelInterval && (
            <p>
              <FormattedMessage
                id="visTypeTimeseries.dataTimeRangeModeLabel.panelInterval"
                defaultMessage="Interval: {formattedPanelInterval}"
                values={{ formattedPanelInterval }}
              />
            </p>
          ),
        }}
      />
    );

    return (
      <EuiToolTip position="top" content={tooltipContent}>
        <EuiLink href="#">{lastValueFormattedMessage}</EuiLink>
      </EuiToolTip>
    );
  };

  const lastValueLabel =
    seriesData && panelInterval ? getLastValueLabelWithTooltip() : lastValueFormattedMessage;

  return (
    <EuiFlexItem grow={false}>
      <EuiText color="default" size="xs">
        <FormattedMessage
          id="visTypeTimeseries.dataTimeRangeModeLabel.dataTimeRangeMode"
          defaultMessage="Data timerange mode: {timeRangeMode}"
          values={{
            timeRangeMode:
              modelTimeRangeMode === TIME_RANGE_DATA_MODES.LAST_VALUE ? (
                lastValueLabel
              ) : (
                <FormattedMessage
                  id="visTypeTimeseries.dataTimeRangeModeLabel.entireTimeRangeMode"
                  defaultMessage="Entire time range"
                />
              ),
          }}
        />
      </EuiText>
    </EuiFlexItem>
  );
};
