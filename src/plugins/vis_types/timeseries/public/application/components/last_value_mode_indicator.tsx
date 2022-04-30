/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexItem, EuiToolTip, EuiFlexGroup, EuiBadge } from '@elastic/eui';
import { getUISettings } from '../../services';
import { convertIntervalIntoUnit, isAutoInterval, isGteInterval } from './lib/get_interval';
import { createIntervalBasedFormatter } from './lib/create_interval_based_formatter';
import type { PanelData } from '../../../common/types';

interface LastValueModeIndicatorProps {
  seriesData?: PanelData['data'];
  panelInterval: number;
  modelInterval: string;
  ignoreDaylightTime: boolean;
}

const lastValueLabel = i18n.translate('visTypeTimeseries.lastValueModeIndicator.lastValue', {
  defaultMessage: 'Last value',
});

export const LastValueModeIndicator = ({
  seriesData,
  panelInterval,
  modelInterval,
  ignoreDaylightTime,
}: LastValueModeIndicatorProps) => {
  if (!seriesData?.length) return <EuiBadge>{lastValueLabel}</EuiBadge>;

  const dateFormat = getUISettings().get('dateFormat');
  const scaledDataFormat = getUISettings().get('dateFormat:scaled');

  const getFormattedPanelInterval = () => {
    const interval = convertIntervalIntoUnit(panelInterval, false);
    return interval && `${interval.unitValue}${interval.unitString}`;
  };

  const formatter = createIntervalBasedFormatter(
    panelInterval,
    scaledDataFormat,
    dateFormat,
    ignoreDaylightTime
  );
  const lastBucketDate = formatter(seriesData[seriesData.length - 1][0]);
  const formattedPanelInterval =
    (isAutoInterval(modelInterval) || isGteInterval(modelInterval)) && getFormattedPanelInterval();

  const tooltipContent = (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="visTypeTimeseries.lastValueModeIndicator.lastBucketDate"
          defaultMessage="Bucket: {lastBucketDate}"
          values={{ lastBucketDate }}
        />
      </EuiFlexItem>
      {formattedPanelInterval && (
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="visTypeTimeseries.lastValueModeIndicator.panelInterval"
            defaultMessage="Interval: {formattedPanelInterval}"
            values={{ formattedPanelInterval }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <EuiToolTip position="top" display="inlineBlock" content={tooltipContent}>
      <EuiBadge
        iconType="iInCircle"
        iconSide="right"
        onClick={() => {}}
        onClickAriaLabel={i18n.translate(
          'visTypeTimeseries.lastValueModeIndicator.lastValueModeBadgeAriaLabel',
          {
            defaultMessage: 'View last value details',
          }
        )}
      >
        {lastValueLabel}
      </EuiBadge>
    </EuiToolTip>
  );
};
