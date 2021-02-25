/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexItem, EuiLink, EuiText, EuiToolTip, EuiFlexGroup } from '@elastic/eui';
import { getUISettings } from '../../services';
import { convertIntervalIntoUnit, isAutoInterval, isGteInterval } from './lib/get_interval';
import { createIntervalBasedFormatter } from '../components/lib/create_interval_based_formatter';
import { TIME_RANGE_DATA_MODES } from '../../../common/timerange_data_modes';
import { PanelData } from '../../../common/types';

const lastValueFormattedMessage = i18n.translate(
  'visTypeTimeseries.dataTimeRangeModeLabel.lastValueMode',
  {
    defaultMessage: 'Last value',
  }
);

interface DataTimeRangeModeLabelProps {
  seriesData?: PanelData['data'];
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
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="visTypeTimeseries.dataTimeRangeModeLabel.panelInterval"
            defaultMessage="Interval: {formattedPanelInterval}"
            values={{ formattedPanelInterval }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <EuiToolTip position="top" content={tooltipContent}>
        <EuiLink onClick={() => {}}>{lastValueFormattedMessage}</EuiLink>
      </EuiToolTip>
    );
  };

  const lastValueLabel =
    seriesData?.length && panelInterval
      ? getLastValueLabelWithTooltip()
      : lastValueFormattedMessage;

  return (
    <EuiFlexItem grow={false}>
      <EuiText color="default" size="xs">
        <FormattedMessage
          id="visTypeTimeseries.dataTimeRangeModeLabel.dataTimeRangeMode"
          defaultMessage="Data timerange mode: {timeRangeMode}"
          values={{
            timeRangeMode:
              modelTimeRangeMode === TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE ? (
                <FormattedMessage
                  id="visTypeTimeseries.dataTimeRangeModeLabel.entireTimeRangeMode"
                  defaultMessage="Entire time range"
                />
              ) : (
                lastValueLabel
              ),
          }}
        />
      </EuiText>
    </EuiFlexItem>
  );
};
