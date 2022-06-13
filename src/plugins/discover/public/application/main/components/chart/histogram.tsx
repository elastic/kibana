/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './histogram.scss';
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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import dateMath from '@elastic/datemath';
import {
  Axis,
  BrushEndListener,
  Chart,
  ElementClickListener,
  HistogramBarSeries,
  Position,
  ScaleType,
  Settings,
  TooltipType,
  XYBrushEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { IUiSettingsClient } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import {
  CurrentTime,
  Endzones,
  getAdjustedInterval,
  renderEndzoneTooltip,
} from '../../../../../../charts/public';
import { DataCharts$, DataChartsMessage } from '../../utils/use_saved_search';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../utils/use_data_state';
import { LEGACY_TIME_AXIS, MULTILAYER_TIME_AXIS_STYLE } from '../../../../../../charts/common';

export interface DiscoverHistogramProps {
  savedSearchData$: DataCharts$;
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

export function DiscoverHistogram({
  savedSearchData$,
  timefilterUpdateHandler,
}: DiscoverHistogramProps) {
  const { data, theme, uiSettings, fieldFormats } = useDiscoverServices();
  const chartTheme = theme.useChartsTheme();
  const chartBaseTheme = theme.useChartsBaseTheme();

  const dataState: DataChartsMessage = useDataState(savedSearchData$);

  const timeZone = getTimezone(uiSettings);
  const { chartData, bucketInterval, fetchStatus, error } = dataState;

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
    return `${toMoment(timeRange.from)} - ${toMoment(timeRange.to)}`;
  }, [from, to, toMoment]);

  if (!chartData && fetchStatus === FetchStatus.LOADING) {
    return (
      <div className="dscHistogram" data-test-subj="discoverChart">
        <div className="dscChart__loading">
          <EuiText size="xs" color="subdued">
            <EuiLoadingChart mono size="l" />
            <EuiSpacer size="s" />
            <FormattedMessage id="discover.loadingChartResults" defaultMessage="Loading chart" />
          </EuiText>
        </div>
      </div>
    );
  }

  if (fetchStatus === FetchStatus.ERROR && error) {
    return (
      <div className="dscHistogram__errorChartContainer">
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false} className="dscHistogram__errorChart__icon">
            <EuiIcon type="visBarVertical" color="danger" size="m" />
          </EuiFlexItem>
          <EuiFlexItem className="dscHistogram__errorChart">
            <EuiText size="s" color="danger">
              <FormattedMessage
                id="discover.errorLoadingChart"
                defaultMessage="Error loading chart"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText className="dscHistogram__errorChart__text" size="s">
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

  const toolTipTitle = i18n.translate('discover.timeIntervalWithValueWarning', {
    defaultMessage: 'Warning',
  });

  const toolTipContent = i18n.translate('discover.bucketIntervalTooltip', {
    defaultMessage:
      'This interval creates {bucketsDescription} to show in the selected time range, so it has been scaled to {bucketIntervalDescription}.',
    values: {
      bucketsDescription:
        bucketInterval!.scale && bucketInterval!.scale > 1
          ? i18n.translate('discover.bucketIntervalTooltip.tooLargeBucketsText', {
              defaultMessage: 'buckets that are too large',
            })
          : i18n.translate('discover.bucketIntervalTooltip.tooManyBucketsText', {
              defaultMessage: 'too many buckets',
            }),
      bucketIntervalDescription: bucketInterval?.description,
    },
  });

  let timeRange = (
    <EuiText size="xs" className="dscHistogramTimeRange" textAlign="center">
      {timeRangeText}
    </EuiText>
  );
  if (bucketInterval?.scaled) {
    timeRange = (
      <EuiFlexGroup
        alignItems="baseline"
        justifyContent="center"
        gutterSize="none"
        responsive={false}
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
      <div className="dscHistogram" data-test-subj="discoverChart" data-time-range={timeRangeText}>
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
            id="discover-histogram-left-axis"
            position={Position.Left}
            ticks={2}
            integersOnly
            tickFormat={(value) => xAxisFormatter.convert(value)}
          />
          <Axis
            id="discover-histogram-bottom-axis"
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
            id="discover-histogram"
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
