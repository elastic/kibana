/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import dateMath from '@kbn/datemath';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { UnifiedHistogramBucketInterval } from '../../types';

export const useTimeRange = ({
  uiSettings,
  bucketInterval,
  timeRange: { from, to },
  timeInterval,
  isPlainRecord,
  timeField,
}: {
  uiSettings: IUiSettingsClient;
  bucketInterval?: UnifiedHistogramBucketInterval;
  timeRange: TimeRange;
  timeInterval?: string;
  isPlainRecord?: boolean;
  timeField?: string;
}) => {
  const dateFormat = useMemo(() => uiSettings.get('dateFormat'), [uiSettings]);

  const toMoment = useCallback(
    (datetime?: moment.Moment) => {
      if (!datetime) {
        return '';
      }
      if (!dateFormat) {
        return String(datetime);
      }
      return datetime.format(dateFormat);
    },
    [dateFormat]
  );

  const timeRangeText = useMemo(() => {
    if (!timeField && isPlainRecord) {
      return '';
    }

    const timeRange = {
      from: dateMath.parse(from),
      to: dateMath.parse(to, { roundUp: true }),
    };

    const intervalText = Boolean(isPlainRecord)
      ? ''
      : i18n.translate('unifiedHistogram.histogramTimeRangeIntervalDescription', {
          defaultMessage: '(interval: {value})',
          values: {
            value: `${
              timeInterval === 'auto'
                ? `${i18n.translate('unifiedHistogram.histogramTimeRangeIntervalAuto', {
                    defaultMessage: 'Auto',
                  })} - `
                : ''
            }${
              bucketInterval?.description ??
              i18n.translate('unifiedHistogram.histogramTimeRangeIntervalLoading', {
                defaultMessage: 'Loading',
              })
            }`,
          },
        });

    return `${toMoment(timeRange.from)} - ${toMoment(timeRange.to)} ${intervalText}`;
  }, [bucketInterval?.description, from, isPlainRecord, timeField, timeInterval, to, toMoment]);

  const { euiTheme } = useEuiTheme();
  const timeRangeCss = css`
    padding: 0 ${euiTheme.size.s} 0 ${euiTheme.size.s};
  `;

  let timeRangeDisplay = timeRangeText ? (
    <EuiText size="xs" textAlign="center" css={timeRangeCss}>
      {timeRangeText}
    </EuiText>
  ) : null;

  if (bucketInterval?.scaled) {
    const toolTipTitle = i18n.translate('unifiedHistogram.timeIntervalWithValueWarning', {
      defaultMessage: 'Warning',
    });

    const toolTipContent = i18n.translate('unifiedHistogram.bucketIntervalTooltip', {
      defaultMessage:
        'This interval creates {bucketsDescription} to show in the selected time range, so it has been scaled to {bucketIntervalDescription}.',
      values: {
        bucketsDescription:
          bucketInterval.scale && bucketInterval.scale > 1
            ? i18n.translate('unifiedHistogram.bucketIntervalTooltip.tooLargeBucketsText', {
                defaultMessage: 'buckets that are too large',
              })
            : i18n.translate('unifiedHistogram.bucketIntervalTooltip.tooManyBucketsText', {
                defaultMessage: 'too many buckets',
              }),
        bucketIntervalDescription: bucketInterval.description,
      },
    });

    const timeRangeWrapperCss = css`
      flex-grow: 0;
    `;

    timeRangeDisplay = (
      <EuiFlexGroup
        alignItems="baseline"
        justifyContent="center"
        gutterSize="none"
        responsive={false}
        css={timeRangeWrapperCss}
      >
        <EuiFlexItem grow={false}>{timeRangeDisplay}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="warning"
            color="warning"
            title={toolTipTitle}
            content={toolTipContent}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return {
    timeRangeText,
    timeRangeDisplay,
  };
};
