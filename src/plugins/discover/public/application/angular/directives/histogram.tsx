/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment, { unitOfTime } from 'moment-timezone';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  Axis,
  Chart,
  HistogramBarSeries,
  Position,
  ScaleType,
  Settings,
  TooltipType,
  ElementClickListener,
  XYChartElementEvent,
  BrushEndListener,
  Theme,
} from '@elastic/charts';

import { IUiSettingsClient } from 'kibana/public';
import { EuiChartThemeType } from '@elastic/eui/dist/eui_charts_theme';
import { Subscription, combineLatest } from 'rxjs';
import { getServices } from '../../../kibana_services';
import { Chart as IChart } from '../helpers/point_series';
import {
  CurrentTime,
  Endzones,
  getAdjustedInterval,
  renderEndzoneTooltip,
} from '../../../../../charts/public';

export interface DiscoverHistogramProps {
  chartData: IChart;
  timefilterUpdateHandler: (ranges: { from: number; to: number }) => void;
}

interface DiscoverHistogramState {
  chartsTheme: EuiChartThemeType['theme'];
  chartsBaseTheme: Theme;
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

export class DiscoverHistogram extends Component<DiscoverHistogramProps, DiscoverHistogramState> {
  public static propTypes = {
    chartData: PropTypes.object,
    timefilterUpdateHandler: PropTypes.func,
  };

  private subscription?: Subscription;
  public state = {
    chartsTheme: getServices().theme.chartsDefaultTheme,
    chartsBaseTheme: getServices().theme.chartsDefaultBaseTheme,
  };

  componentDidMount() {
    this.subscription = combineLatest([
      getServices().theme.chartsTheme$,
      getServices().theme.chartsBaseTheme$,
    ]).subscribe(([chartsTheme, chartsBaseTheme]) =>
      this.setState({ chartsTheme, chartsBaseTheme })
    );
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public onBrushEnd: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [from, to] = x;
    this.props.timefilterUpdateHandler({ from, to });
  };

  public onElementClick = (xInterval: number): ElementClickListener => ([elementData]) => {
    const startRange = (elementData as XYChartElementEvent)[0].x;

    const range = {
      from: startRange,
      to: startRange + xInterval,
    };

    this.props.timefilterUpdateHandler(range);
  };

  public formatXValue = (val: string) => {
    const xAxisFormat = this.props.chartData.xAxisFormat.params!.pattern;

    return moment(val).format(xAxisFormat);
  };

  public render() {
    const uiSettings = getServices().uiSettings;
    const timeZone = getTimezone(uiSettings);
    const { chartData } = this.props;
    const { chartsTheme, chartsBaseTheme } = this.state;

    if (!chartData) {
      return null;
    }

    const data = chartData.values;
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
      headerFormatter: renderEndzoneTooltip(xInterval, domainStart, domainEnd, this.formatXValue),
      type: TooltipType.VerticalCursor,
    };

    return (
      <Chart size="100%">
        <Settings
          xDomain={xDomain}
          onBrushEnd={this.onBrushEnd}
          onElementClick={this.onElementClick(xInterval)}
          tooltip={tooltipProps}
          theme={chartsTheme}
          baseTheme={chartsBaseTheme}
        />
        <Axis
          id="discover-histogram-left-axis"
          position={Position.Left}
          ticks={5}
          title={chartData.yAxisLabel}
        />
        <Axis
          id="discover-histogram-bottom-axis"
          position={Position.Bottom}
          title={chartData.xAxisLabel}
          tickFormat={this.formatXValue}
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
          name={chartData.yAxisLabel}
        />
      </Chart>
    );
  }
}
