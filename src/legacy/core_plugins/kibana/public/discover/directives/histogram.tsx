/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer } from '@elastic/eui';
import moment from 'moment-timezone';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import lightEuiTheme from '@elastic/eui/dist/eui_theme_light.json';
import darkEuiTheme from '@elastic/eui/dist/eui_theme_dark.json';

import {
  AnnotationDomainTypes,
  Axis,
  Chart,
  HistogramBarSeries,
  GeometryValue,
  getAnnotationId,
  getAxisId,
  getSpecId,
  LineAnnotation,
  Position,
  ScaleType,
  Settings,
  RectAnnotation,
  TooltipValue,
  TooltipType,
} from '@elastic/charts';

import { i18n } from '@kbn/i18n';

import { getChartTheme } from 'ui/elastic_charts';
import chrome from 'ui/chrome';
// @ts-ignore: path dynamic for kibana
import { timezoneProvider } from 'ui/vis/lib/timezone';

export interface DiscoverHistogramProps {
  chartData: any;
  timefilterUpdateHandler: (ranges: { from: number; to: number }) => void;
}

export class DiscoverHistogram extends Component<DiscoverHistogramProps> {
  public static propTypes = {
    chartData: PropTypes.object,
    timefilterUpdateHandler: PropTypes.func,
  };

  public onBrushEnd = (min: number, max: number) => {
    const range = {
      from: min,
      to: max,
    };

    this.props.timefilterUpdateHandler(range);
  };

  public onElementClick = (xInterval: number) => (elementData: GeometryValue[]) => {
    const startRange = elementData[0].x;

    const range = {
      from: startRange,
      to: startRange + xInterval,
    };

    this.props.timefilterUpdateHandler(range);
  };

  public formatXValue = (val: string) => {
    const xAxisFormat = this.props.chartData.xAxisFormat.params.pattern;

    return moment(val).format(xAxisFormat);
  };

  public renderBarTooltip = (xInterval: number, domainStart: number, domainEnd: number) => (
    headerData: TooltipValue
  ): JSX.Element | string => {
    const headerDataValue = headerData.value;
    const formattedValue = this.formatXValue(headerDataValue);

    const partialDataText = i18n.translate('kbn.discover.histogram.partialData.bucketTooltipText', {
      defaultMessage:
        'The selected time range does not include this entire bucket, it may contain partial data.',
    });

    if (headerDataValue < domainStart || headerDataValue + xInterval > domainEnd) {
      return (
        <React.Fragment>
          <EuiFlexGroup
            alignItems="center"
            className="dscHistogram__header--partial"
            responsive={false}
            gutterSize="xs"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="iInCircle" />
            </EuiFlexItem>
            <EuiFlexItem>{partialDataText}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <p>{formattedValue}</p>
        </React.Fragment>
      );
    }

    return formattedValue;
  };

  public render() {
    const uiSettings = chrome.getUiSettingsClient();
    const timeZone = timezoneProvider(uiSettings)();
    const { chartData } = this.props;

    if (!chartData || !chartData.series[0]) {
      return null;
    }

    const data = chartData.series[0].values;

    /**
     * Deprecation: [interval] on [date_histogram] is deprecated, use [fixed_interval] or [calendar_interval].
     * see https://github.com/elastic/kibana/issues/27410
     * TODO: Once the Discover query has been update, we should change the below to use the new field
     */
    const xInterval = chartData.ordered.interval;

    const xValues = chartData.xAxisOrderedValues;
    const lastXValue = xValues[xValues.length - 1];

    const domain = chartData.ordered;
    const domainStart = domain.min.valueOf();
    const domainEnd = domain.max.valueOf();

    const domainMin = data[0].x > domainStart ? domainStart : data[0].x;
    const domainMax = domainEnd - xInterval > lastXValue ? domainEnd - xInterval : lastXValue;

    const xDomain = {
      min: domainMin,
      max: domainMax,
      minInterval: xInterval,
    };

    // Domain end of 'now' will be milliseconds behind current time, so we extend time by 1 minute and check if
    // the annotation is within this range; if so, the line annotation uses the domainEnd as its value
    const now = moment();
    const isAnnotationAtEdge =
      moment(domainEnd)
        .add(60000)
        .isAfter(now) && now.isAfter(domainEnd);
    const lineAnnotationValue = isAnnotationAtEdge ? domainEnd : now;

    const lineAnnotationData = [
      {
        dataValue: lineAnnotationValue,
      },
    ];
    const isDarkMode = uiSettings.get('theme:darkMode');

    const lineAnnotationStyle = {
      line: {
        strokeWidth: 2,
        stroke: isDarkMode ? darkEuiTheme.euiColorDanger : lightEuiTheme.euiColorDanger,
        opacity: 0.7,
      },
    };

    const rectAnnotations = [];
    if (domainStart !== domainMin) {
      rectAnnotations.push({
        coordinates: {
          x1: domainStart,
        },
      });
    }
    if (domainEnd !== domainMax) {
      rectAnnotations.push({
        coordinates: {
          x0: domainEnd,
        },
      });
    }

    const rectAnnotationStyle = {
      stroke: isDarkMode ? darkEuiTheme.euiColorLightShade : lightEuiTheme.euiColorDarkShade,
      strokeWidth: 0,
      opacity: isDarkMode ? 0.6 : 0.2,
      fill: isDarkMode ? darkEuiTheme.euiColorLightShade : lightEuiTheme.euiColorDarkShade,
    };

    const tooltipProps = {
      headerFormatter: this.renderBarTooltip(xInterval, domainStart, domainEnd),
      type: TooltipType.VerticalCursor,
    };

    return (
      <Chart size="100%">
        <Settings
          xDomain={xDomain}
          onBrushEnd={this.onBrushEnd}
          onElementClick={this.onElementClick(xInterval)}
          tooltip={tooltipProps}
          theme={getChartTheme()}
        />
        <Axis
          id={getAxisId('discover-histogram-left-axis')}
          position={Position.Left}
          ticks={5}
          title={chartData.yAxisLabel}
        />
        <Axis
          id={getAxisId('discover-histogram-bottom-axis')}
          position={Position.Bottom}
          title={chartData.xAxisLabel}
          tickFormat={this.formatXValue}
          ticks={10}
        />
        <LineAnnotation
          annotationId={getAnnotationId('line-annotation')}
          domainType={AnnotationDomainTypes.XDomain}
          dataValues={lineAnnotationData}
          hideTooltips={true}
          style={lineAnnotationStyle}
        />
        <RectAnnotation
          dataValues={rectAnnotations}
          annotationId={getAnnotationId('rect-annotation')}
          zIndex={2}
          style={rectAnnotationStyle}
          hideTooltips={true}
        />
        <HistogramBarSeries
          id={getSpecId('discover-histogram')}
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
