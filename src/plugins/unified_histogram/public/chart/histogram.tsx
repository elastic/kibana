/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { unitOfTime } from 'moment-timezone';
import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLoadingChart,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import dateMath from '@kbn/datemath';
import type {
  BrushEndListener,
  ElementClickListener,
  XYBrushEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import {
  Axis,
  Chart,
  HistogramBarSeries,
  Position,
  ScaleType,
  Settings,
  TooltipType,
} from '@elastic/charts';
import type { IUiSettingsClient } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  CurrentTime,
  Endzones,
  getAdjustedInterval,
  renderEndzoneTooltip,
} from '@kbn/charts-helpers';
import { LEGACY_TIME_AXIS, MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import { css } from '@emotion/react';
import type { UnifiedHistogramChartContext, UnifiedHistogramServices } from '../types';

export interface HistogramProps {
  services: UnifiedHistogramServices;
  chart: UnifiedHistogramChartContext;
  timefilterUpdateHandler: (ranges: { from: number; to: number }) => void;
}

function getTimezone(uiSettings: IUiSettingsClient) {
  if (uiSettings.isDefault('dateFormat:tz')) {
    const detectedTimezone = moment.tz.guess();
    if (detectedTimezone) return detectedTimezone;
    else return moment().format('Z');
  } else {
    return uiSettings.get('dateFormat:tz', 'Browser');
  }
}

export function Histogram({
  services: { data, theme, uiSettings, fieldFormats },
  chart: { status, timeInterval, bucketInterval, data: chartData, error },
  timefilterUpdateHandler,
}: HistogramProps) {
  const chartTheme = theme.useChartsTheme();
  const chartBaseTheme = theme.useChartsBaseTheme();
  const timeZone = getTimezone(uiSettings);

  const onBrushEnd = useCallback(
    ({ x }: XYBrushEvent) => {
      if (!x) {
        return;
      }
      const [from, to] = x;
      timefilterUpdateHandler({ from, to });
    },
    [timefilterUpdateHandler]
  );

  const onElementClick = useCallback(
    (xInterval: number): ElementClickListener =>
      ([elementData]) => {
        const startRange = (elementData as XYChartElementEvent)[0].x;

        const range = {
          from: startRange,
          to: startRange + xInterval,
        };

        timefilterUpdateHandler(range);
      },
    [timefilterUpdateHandler]
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
    padding: 0 ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s};
  `;

  if (!chartData && status === 'loading') {
    const chartLoadingCss = css`
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1 0 100%;
      text-align: center;
      height: 100%;
      width: 100%;
    `;

    return (
      <div data-test-subj="unifiedHistogramChart" css={chartCss}>
        <div css={chartLoadingCss} data-test-subj="unifiedHistogramChartLoading">
          <EuiText size="xs" color="subdued">
            <EuiLoadingChart mono size="l" />
            <EuiSpacer size="s" />
            <FormattedMessage
              id="unifiedHistogram.loadingChartResults"
              defaultMessage="Loading chart"
            />
          </EuiText>
        </div>
      </div>
    );
  }

  if (status === 'error' && error) {
    const chartErrorContainerCss = css`
      padding: 0 ${euiTheme.size.s} 0 ${euiTheme.size.s};
    `;
    const chartErrorIconCss = css`
      padding-top: 0.5 * ${euiTheme.size.xs};
    `;
    const chartErrorCss = css`
      margin-left: ${euiTheme.size.xs} !important;
    `;
    const chartErrorTextCss = css`
      margin-top: ${euiTheme.size.s};
    `;

    return (
      <div css={chartErrorContainerCss} data-test-subj="unifiedHistogramErrorChartContainer">
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false} css={chartErrorIconCss}>
            <EuiIcon type="visBarVertical" color="danger" size="m" />
          </EuiFlexItem>
          <EuiFlexItem css={chartErrorCss}>
            <EuiText size="s" color="danger">
              <FormattedMessage
                id="unifiedHistogram.errorLoadingChart"
                defaultMessage="Error loading chart"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="s" css={chartErrorTextCss} data-test-subj="unifiedHistogramErrorChartText">
          {error.message}
        </EuiText>
      </div>
    );
  }

  if (!chartData) {
    return null;
  }

  const formatXValue = (val: string) => {
    const xAxisFormat = chartData.xAxisFormat.params!.pattern;
    return moment(val).format(xAxisFormat);
  };

  const isDarkMode = uiSettings.get('theme:darkMode');

  /*
   * Deprecation: [interval] on [date_histogram] is deprecated, use [fixed_interval] or [calendar_interval].
   * see https://github.com/elastic/kibana/issues/27410
   * TODO: Once the Discover query has been update, we should change the below to use the new field
   */
  const { intervalESValue, intervalESUnit, interval } = chartData.ordered;
  const xInterval = interval.asMilliseconds();

  const xValues = chartData.xAxisOrderedValues;
  const lastXValue = xValues[xValues.length - 1];

  const domain = chartData.ordered;
  const domainStart = domain.min.valueOf();
  const domainEnd = domain.max.valueOf();

  const domainMin = Math.min(chartData.values[0]?.x, domainStart);
  const domainMax = Math.max(domainEnd - xInterval, lastXValue);

  const xDomain = {
    min: domainMin,
    max: domainMax,
    minInterval: getAdjustedInterval(
      xValues,
      intervalESValue,
      intervalESUnit as unitOfTime.Base,
      timeZone
    ),
  };
  const tooltipProps = {
    headerFormatter: renderEndzoneTooltip(xInterval, domainStart, domainEnd, formatXValue),
    type: TooltipType.VerticalCursor,
  };

  const xAxisFormatter = fieldFormats.deserialize(chartData.yAxisFormat);

  const useLegacyTimeAxis = uiSettings.get(LEGACY_TIME_AXIS, false);

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

  return (
    <React.Fragment>
      <div data-test-subj="unifiedHistogramChart" data-time-range={timeRangeText} css={chartCss}>
        <Chart size="100%">
          <Settings
            xDomain={xDomain}
            onBrushEnd={onBrushEnd as BrushEndListener}
            onElementClick={onElementClick(xInterval)}
            tooltip={tooltipProps}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
            allowBrushingLastHistogramBin={true}
          />
          <Axis
            id="unifiedHistogramLeftAxis"
            position={Position.Left}
            ticks={2}
            integersOnly
            tickFormat={(value) => xAxisFormatter.convert(value)}
          />
          <Axis
            id="unifiedHistogramBottomAxis"
            position={Position.Bottom}
            tickFormat={formatXValue}
            timeAxisLayerCount={useLegacyTimeAxis ? 0 : 2}
            style={useLegacyTimeAxis ? {} : MULTILAYER_TIME_AXIS_STYLE}
          />
          <CurrentTime isDarkMode={isDarkMode} domainEnd={domainEnd} />
          <Endzones
            isDarkMode={isDarkMode}
            domainStart={domainStart}
            domainEnd={domainEnd}
            interval={xDomain.minInterval}
            domainMin={xDomain.min}
            domainMax={xDomain.max}
          />
          <HistogramBarSeries
            id="unifiedHistogramBarSeries"
            minBarHeight={2}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={chartData.values}
            yNice
            timeZone={timeZone}
            name={chartData.yAxisLabel}
          />
        </Chart>
      </div>
      {timeRange}
    </React.Fragment>
  );
}
