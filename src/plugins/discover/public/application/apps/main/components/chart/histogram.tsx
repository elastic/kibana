/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './histogram.scss';
import moment, { unitOfTime } from 'moment-timezone';
import React, { useState, useEffect, useCallback } from 'react';
import { EuiLoadingChart, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

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
  XYChartElementEvent,
} from '@elastic/charts';

import { IUiSettingsClient } from 'kibana/public';
import { combineLatest } from 'rxjs';
import {
  CurrentTime,
  Endzones,
  getAdjustedInterval,
  renderEndzoneTooltip,
} from '../../../../../../../charts/public';
import { DataCharts$, DataChartsMessage } from '../../services/use_saved_search';
import { FetchStatus } from '../../../../types';
import { DiscoverServices } from '../../../../../build_services';
import { useDataState } from '../../utils/use_data_state';

export interface DiscoverHistogramProps {
  savedSearchData$: DataCharts$;
  timefilterUpdateHandler: (ranges: { from: number; to: number }) => void;
  services: DiscoverServices;
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
  services,
}: DiscoverHistogramProps) {
  const [theme, setTheme] = useState({
    chartsTheme: services.theme.chartsDefaultTheme,
    chartsBaseTheme: services.theme.chartsDefaultBaseTheme,
  });

  useEffect(() => {
    const themeSubscription = combineLatest([
      services.theme.chartsTheme$,
      services.theme.chartsBaseTheme$,
    ]).subscribe(([chartsTheme, chartsBaseTheme]) => {
      if (chartsTheme !== theme.chartsTheme || chartsBaseTheme !== theme.chartsBaseTheme)
        setTheme({ chartsTheme, chartsBaseTheme });
    });
    return () => {
      return themeSubscription.unsubscribe();
    };
  }, [
    services.theme.chartsBaseTheme$,
    services.theme.chartsTheme$,
    theme.chartsBaseTheme,
    theme.chartsTheme,
  ]);

  const dataState: DataChartsMessage = useDataState(savedSearchData$);

  const uiSettings = services.uiSettings;
  const timeZone = getTimezone(uiSettings);
  const { chartData, fetchStatus } = dataState;

  const onBrushEnd: BrushEndListener = useCallback(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [from, to] = x;
      timefilterUpdateHandler({ from, to });
    },
    [timefilterUpdateHandler]
  );

  const onElementClick = useCallback(
    (xInterval: number): ElementClickListener => ([elementData]) => {
      const startRange = (elementData as XYChartElementEvent)[0].x;

      const range = {
        from: startRange,
        to: startRange + xInterval,
      };

      timefilterUpdateHandler(range);
    },
    [timefilterUpdateHandler]
  );

  if (!chartData && fetchStatus === FetchStatus.LOADING) {
    return (
      <div className="dscChart__loading">
        <EuiText size="xs" color="subdued">
          <EuiLoadingChart mono size="l" />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.loadingChartResults" defaultMessage="Loading chart" />
        </EuiText>
      </div>
    );
  }

  if (!chartData) {
    return null;
  }

  const formatXValue = (val: string) => {
    const xAxisFormat = chartData!.xAxisFormat.params!.pattern;
    return moment(val).format(xAxisFormat);
  };

  const data = chartData!.values;
  const isDarkMode = uiSettings.get('theme:darkMode');

  /*
   * Deprecation: [interval] on [date_histogram] is deprecated, use [fixed_interval] or [calendar_interval].
   * see https://github.com/elastic/kibana/issues/27410
   * TODO: Once the Discover query has been update, we should change the below to use the new field
   */
  const { intervalESValue, intervalESUnit, interval } = chartData.ordered;
  const xInterval = interval.asMilliseconds();

  const xValues = chartData!.xAxisOrderedValues;
  const lastXValue = xValues[xValues.length - 1];

  const domain = chartData!.ordered;
  const domainStart = domain.min.valueOf();
  const domainEnd = domain.max.valueOf();

  const domainMin = Math.min(data[0]?.x, domainStart);
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

  const xAxisFormatter = services.data.fieldFormats.deserialize(chartData!.yAxisFormat);

  return (
    <Chart size="100%">
      <Settings
        xDomain={xDomain}
        onBrushEnd={onBrushEnd}
        onElementClick={onElementClick(xInterval)}
        tooltip={tooltipProps}
        theme={theme.chartsTheme}
        baseTheme={theme.chartsBaseTheme}
      />
      <Axis
        id="discover-histogram-left-axis"
        position={Position.Left}
        ticks={5}
        title={chartData!.yAxisLabel}
        integersOnly
        tickFormat={(value) => xAxisFormatter.convert(value)}
      />
      <Axis
        id="discover-histogram-bottom-axis"
        position={Position.Bottom}
        title={chartData!.xAxisLabel}
        tickFormat={formatXValue}
        ticks={10}
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
        data={data}
        timeZone={timeZone}
        name={chartData!.yAxisLabel}
      />
    </Chart>
  );
}
