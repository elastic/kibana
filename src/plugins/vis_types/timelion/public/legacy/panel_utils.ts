/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, defaults, mergeWith, compact } from 'lodash';
import $ from 'jquery';
import moment, { Moment } from 'moment-timezone';

import { TimefilterContract } from '@kbn/data-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';

import { calculateInterval } from '../../common/lib';
import { xaxisFormatterProvider } from '../helpers/xaxis_formatter';
import { Series } from '../helpers/timelion_request_handler';
import { colors } from '../helpers/chart_constants';

export interface LegacyAxis {
  delta?: number;
  max?: number;
  min?: number;
  mode: string;
  options?: {
    units: { prefix: string; suffix: string };
  };
  tickSize?: number;
  ticks: number;
  tickLength: number;
  timezone: string;
  tickDecimals?: number;
  tickFormatter: ((val: number) => string) | ((val: number, axis: LegacyAxis) => string);
  tickGenerator?(axis: LegacyAxis): number[];
  units?: { type: string };
}

interface TimeRangeBounds {
  min: Moment | undefined;
  max: Moment | undefined;
}

export const ACTIVE_CURSOR = 'ACTIVE_CURSOR_TIMELION';
export const eventBus = $({});

const SERIES_ID_ATTR = 'data-series-id';

function buildSeriesData(chart: Series[], options: jquery.flot.plotOptions) {
  const seriesData = chart.map((series: Series, seriesIndex: number) => {
    const newSeries: Series = cloneDeep(
      defaults(series, {
        shadowSize: 0,
        lines: {
          lineWidth: 3,
        },
      })
    );

    newSeries._id = seriesIndex;

    if (series.color) {
      const span = document.createElement('span');
      span.style.color = series.color;
      newSeries.color = span.style.color;
    }

    if (series._hide) {
      newSeries.data = [];
      newSeries.stack = false;
      newSeries.label = `(hidden) ${series.label}`;
    }

    if (series._global) {
      mergeWith(options, series._global, (objVal, srcVal) => {
        // This is kind of gross, it means that you can't replace a global value with a null
        // best you can do is an empty string. Deal with it.
        if (objVal == null) {
          return srcVal;
        }
        if (srcVal == null) {
          return objVal;
        }
      });
    }

    return newSeries;
  });

  return compact(seriesData);
}

function buildOptions(
  intervalValue: string,
  timefilter: TimefilterContract,
  uiSettings: IUiSettingsClient,
  clientWidth = 0,
  showGrid?: boolean
) {
  // Get the X-axis tick format
  const time: TimeRangeBounds = timefilter.getBounds();
  const interval = calculateInterval(
    (time.min && time.min.valueOf()) || 0,
    (time.max && time.max.valueOf()) || 0,
    uiSettings.get('timelion:target_buckets') || 200,
    intervalValue,
    uiSettings.get('timelion:min_interval') || '1ms'
  );
  const format = xaxisFormatterProvider(uiSettings)(interval);

  const tickLetterWidth = 7;
  const tickPadding = 45;

  const options = {
    xaxis: {
      mode: 'time',
      tickLength: 5,
      timezone: 'browser',
      // Calculate how many ticks can fit on the axis
      ticks: Math.floor(clientWidth / (format.length * tickLetterWidth + tickPadding)),
      // Use moment to format ticks so we get timezone correction
      tickFormatter: (val: number) => moment(val).format(format),
    },
    selection: {
      mode: 'x',
      color: '#ccc',
    },
    crosshair: {
      mode: 'x',
      color: '#C66',
      lineWidth: 2,
    },
    colors,
    grid: {
      show: showGrid,
      borderWidth: 0,
      borderColor: null,
      margin: 10,
      hoverable: true,
      autoHighlight: false,
    },
    legend: {
      backgroundColor: 'rgb(255,255,255,0)',
      position: 'nw',
      labelBoxBorderColor: 'rgb(255,255,255,0)',
      labelFormatter(label: string, series: { _id: number }) {
        const wrapperSpan = document.createElement('span');
        const labelSpan = document.createElement('span');
        const numberSpan = document.createElement('span');

        wrapperSpan.setAttribute('class', 'ngLegendValue');
        wrapperSpan.setAttribute(SERIES_ID_ATTR, `${series._id}`);

        labelSpan.appendChild(document.createTextNode(label));
        numberSpan.setAttribute('class', 'ngLegendValueNumber');

        wrapperSpan.appendChild(labelSpan);
        wrapperSpan.appendChild(numberSpan);

        return wrapperSpan.outerHTML;
      },
    },
  } as jquery.flot.plotOptions & { yaxes?: LegacyAxis[] };

  return options;
}

export { buildSeriesData, buildOptions, SERIES_ID_ATTR };
