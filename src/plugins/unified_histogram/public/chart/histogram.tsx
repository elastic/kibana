/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, useEuiTheme } from '@elastic/eui';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramServices,
} from '../types';
import { getLensAttributes } from './get_lens_attributes';

export interface HistogramProps {
  services: UnifiedHistogramServices;
  dataView: DataView;
  chart: UnifiedHistogramChartContext;
  breakdown?: UnifiedHistogramBreakdownContext;
}

export function Histogram({
  services: { data, lens, uiSettings },
  dataView,
  chart: { timeInterval, bucketInterval, data: chartData },
  breakdown: { field: breakdownField } = {},
}: HistogramProps) {
  const attributes = useMemo(
    () => getLensAttributes({ data, dataView, timeInterval, breakdownField }),
    [breakdownField, data, dataView, timeInterval]
  );

  const { timefilter } = data.query.timefilter;
  const { from, to } = timefilter.getAbsoluteTime();
  const dateFormat = useMemo(() => uiSettings.get('dateFormat'), [uiSettings]);

  const toMoment = useCallback(
    (datetime: moment.Moment | undefined) => {
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
    const timeRange = {
      from: dateMath.parse(from),
      to: dateMath.parse(to, { roundUp: true }),
    };
    const intervalText = i18n.translate('unifiedHistogram.histogramTimeRangeIntervalDescription', {
      defaultMessage: '(interval: {value})',
      values: {
        value: `${
          timeInterval === 'auto'
            ? `${i18n.translate('unifiedHistogram.histogramTimeRangeIntervalAuto', {
                defaultMessage: 'Auto',
              })} - `
            : ''
        }${bucketInterval?.description}`,
      },
    });
    return `${toMoment(timeRange.from)} - ${toMoment(timeRange.to)} ${intervalText}`;
  }, [from, to, timeInterval, bucketInterval?.description, toMoment]);

  const { euiTheme } = useEuiTheme();
  const chartCss = css`
    flex-grow: 1;

    & > div {
      height: 100%;
    }

    & .echLegend .echLegendList {
      padding-right: ${euiTheme.size.s};
    }
  `;

  if (!chartData || !dataView.id || !dataView.isTimeBased()) {
    return null;
  }

  const toolTipTitle = i18n.translate('unifiedHistogram.timeIntervalWithValueWarning', {
    defaultMessage: 'Warning',
  });

  const toolTipContent = i18n.translate('unifiedHistogram.bucketIntervalTooltip', {
    defaultMessage:
      'This interval creates {bucketsDescription} to show in the selected time range, so it has been scaled to {bucketIntervalDescription}.',
    values: {
      bucketsDescription:
        bucketInterval!.scale && bucketInterval!.scale > 1
          ? i18n.translate('unifiedHistogram.bucketIntervalTooltip.tooLargeBucketsText', {
              defaultMessage: 'buckets that are too large',
            })
          : i18n.translate('unifiedHistogram.bucketIntervalTooltip.tooManyBucketsText', {
              defaultMessage: 'too many buckets',
            }),
      bucketIntervalDescription: bucketInterval?.description,
    },
  });

  const timeRangeCss = css`
    padding: 0 ${euiTheme.size.s} 0 ${euiTheme.size.s};
  `;

  let timeRange = (
    <EuiText size="xs" textAlign="center" css={timeRangeCss}>
      {timeRangeText}
    </EuiText>
  );

  if (bucketInterval?.scaled) {
    const timeRangeWrapperCss = css`
      flex-grow: 0;
    `;

    timeRange = (
      <EuiFlexGroup
        alignItems="baseline"
        justifyContent="center"
        gutterSize="none"
        responsive={false}
        css={timeRangeWrapperCss}
      >
        <EuiFlexItem grow={false}>{timeRange}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip type="alert" color="warning" title={toolTipTitle} content={toolTipContent} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const LensComponent = lens.EmbeddableComponent;

  return (
    <>
      <div data-test-subj="unifiedHistogramChart" data-time-range={timeRangeText} css={chartCss}>
        <LensComponent
          id="unifiedHistogramLensComponent"
          viewMode={ViewMode.VIEW}
          timeRange={{ from, to }}
          attributes={attributes}
          noPadding
        />
      </div>
      {timeRange}
    </>
  );
}
