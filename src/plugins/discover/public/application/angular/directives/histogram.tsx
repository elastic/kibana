/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { unitOfTime } from 'moment-timezone';
import React, { Component, useState, useEffect } from 'react';
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
import { getServices, IndexPattern, tabifyAggResponse } from '../../../kibana_services';
import { Chart as IChart } from '../helpers/point_series';
import {
  CurrentTime,
  Endzones,
  getAdjustedInterval,
  renderEndzoneTooltip,
} from '../../../../../charts/public';
import { discoverResponseHandler } from '../response_handler';
import { SearchSource } from '../../../../../data/common/search/search_source';
import { AggConfigs } from '../../../../../data/common/search/aggs';
import { DataPublicPluginStart } from '../../../../../data/public';

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

function setupVisualization({
  data,
  interval,
  timeField,
  timeRange,
  indexPattern,
  searchSource,
}: {
  data: DataPublicPluginStart;
  interval: any;
  timeField: string;
  timeRange: any;
  indexPattern: IndexPattern;
  searchSource: SearchSource;
}) {
  const visStateAggs = [
    {
      type: 'count',
      schema: 'metric',
    },
    {
      type: 'date_histogram',
      schema: 'segment',
      params: {
        field: timeField,
        interval,
        timeRange,
      },
    },
  ];

  const chartAggConfigs = data.search.aggs.createAggConfigs(indexPattern, visStateAggs);

  searchSource.onRequestStart((sSource, options) => {
    return chartAggConfigs.onSearchRequestStart(sSource, options);
  });

  searchSource.setField('aggs', function () {
    if (!chartAggConfigs) return;
    return chartAggConfigs.toDsl();
  });

  return { searchSource, chartAggConfigs };
}

function getDimensions(aggs: any, timeRange: any, timefilter: any) {
  const [metric, agg] = aggs;
  agg.params.timeRange = timeRange;
  const bounds = agg.params.timeRange ? timefilter.calculateBounds(agg.params.timeRange) : null;
  agg.buckets.setBounds(bounds);

  const { esUnit, esValue } = agg.buckets.getInterval();
  return {
    x: {
      accessor: 0,
      label: agg.makeLabel(),
      format: agg.toSerializedFieldFormat(),
      params: {
        date: true,
        interval: moment.duration(esValue, esUnit),
        intervalESValue: esValue,
        intervalESUnit: esUnit,
        format: agg.buckets.getScaledDateFormat(),
        bounds: agg.buckets.getBounds(),
      },
    },
    y: {
      accessor: 1,
      format: metric.toSerializedFieldFormat(),
      label: metric.makeLabel(),
    },
  };
}

async function fetch(
  volatileSearchSource: SearchSource,
  abortController: AbortController,
  chartAggConfigs: AggConfigs,
  timeRange: any,
  timeFilter: any
) {
  try {
    const response = await volatileSearchSource.fetch({
      abortSignal: abortController.signal,
    });
    return onResults(response, chartAggConfigs, timeRange, timeFilter);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
  }
}

function onResults(resp: any, chartAggConfigs: any, timeRange: any, timeFilter: any) {
  const tabifiedData = tabifyAggResponse(chartAggConfigs, resp);

  return discoverResponseHandler(
    tabifiedData,
    getDimensions(chartAggConfigs.aggs, timeRange, timeFilter)
  );
}

export function DiscoverHistogramData(props: any) {
  const [chartData, setChartData] = useState<undefined | any>(undefined);
  useEffect(() => {
    const abortController = new AbortController();
    const searchSource = props.savedSearch.searchSource;
    searchSource
      .setField('index', props.indexPattern)
      .setField('query', props.data.query.queryString.getQuery() || null)
      .setField('filter', props.data.query.filterManager.getFilters());

    const { chartAggConfigs } = setupVisualization({
      data: props.data,
      interval: props.interval,
      timeField: props.timeField,
      timeRange: props.timeRange,
      indexPattern: props.indexPattern,
      searchSource,
    });

    fetch(
      searchSource,
      abortController,
      chartAggConfigs,
      props.timeRange,
      props.data.query.timefilter.timefilter
    ).then((result: any) => {
      setChartData(result);
    });
    return () => {
      abortController.abort();
    };
  }, [
    props.savedSearch,
    props.data,
    props.interval,
    props.timeField,
    props.timeRange,
    props.timeFilter,
    props.indexPattern,
    props.searchSource,
  ]);

  return <DiscoverHistogram {...props} chartData={chartData} />;
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

    const xAxisFormatter = getServices().data.fieldFormats.deserialize(
      this.props.chartData.yAxisFormat
    );

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
          integersOnly
          tickFormat={(value) => xAxisFormatter.convert(value)}
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
