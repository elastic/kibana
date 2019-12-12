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

import React, { useRef } from 'react';
import $ from 'jquery';
import moment from 'moment-timezone';
import { debounce, compact, get, each, noop } from 'lodash';

import './timechart/flot';

import { tickFormatters } from '../services/tick_formatters';
// @ts-ignore
import { calculateInterval, DEFAULT_TIME_FORMAT } from '../../common/lib';
import { xaxisFormatterProvider } from './timechart/xaxis_formatter';
import { generateTicksProvider } from './timechart/tick_generator';

import { useEventListener } from './useEventListener';

import { getServices } from '../kibana_services';
import { DEBOUNCE_DELAY, emptyCaption, staticDefaultOptions } from './constants';

interface PanelProps {
  name: string;
  interval: any;
  search?: any;
  seriesList: any;
}

function Panel({ interval: intervalProp, search = noop, seriesList }: PanelProps) {
  console.log('Panel')
  const chart = seriesList.list;
  const elementRef = useRef(null);
  const canvasElem = useRef(null);
  const legendElem = useRef(null);
  const { uiSettings, timefilter } = getServices();
  const formatters = tickFormatters() as any;
  const getxAxisFormatter = xaxisFormatterProvider(uiSettings);
  const generateTicks = generateTicksProvider();

  if (!canvasElem.current) {
    //return null;
  }

  let legendValueNumbers: any = [];
  let legendCaption: any;

  let highlightedSeries: any;
  let focusedSeries: any;
  const originalColorMap = new Map();

  let legendScope = {};

  const highlightSeries = debounce((id: any) => {
    if (highlightedSeries === id) {
      return;
    }

    highlightedSeries = id;
    chart.forEach((series: any, seriesIndex: any) => {
      if (seriesIndex !== id) {
        series.color = 'rgba(128,128,128,0.1)'; // mark as grey
      } else {
        series.color = originalColorMap.get(series); // color it like it was
      }
    });
    // drawPlot(chart);
  }, DEBOUNCE_DELAY);

  const focusSeries = (id: any) => {
    focusedSeries = id;
    highlightSeries(id);
  };

  const toggleSeries = (id: any) => {
    const series = chart[id];
    series._hide = !series._hide;
    // drawPlot(chart);
  };

  const reactLegend = (
    <span ref={legendElem} className="ngLegendValue" onKeyDown={() => {}}>
      <span />
      <span className="ngLegendValueNumber" />
    </span>
  );

  const defaultOptions = {
    ...staticDefaultOptions,
    grid: {
      show: seriesList.render.grid,
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
      labelFormatter(label: any, series: any) {
        const legend = $(
          `<span><span
            class="ngLegendValue"
          >
            <span>${label}</span>
            <span class="ngLegendValueNumber" />
          </span></span>`
        );
        legend.find('.ngLegendValue').click(() => toggleSeries(series._id));
        const legendNumber = `<span className="ngLegendValueNumber"></span>`;
        legendValueNumbers.push(legendNumber);
        // if (legendElem.current) {
        //   legendElem.current.firstElementChild.innerText = label;
        //   legendElem.current.onclick = () => toggleSeries(series._id);
        // }
        // return `<span
        //     className="ngLegendValue"
        //     onClick="toggleSeries(${series._id})"
        //     onFocus="focusSeries(${series._id})"
        //     onMouseOver="highlightSeries(${series._id})"
        //   >
        //     <span>${label}</span>
        //     ${legendNumber}
        //   </span>`;
        return legend.html();
      },
    },
  };

  $(canvasElem.current).find('.legendLabel').click(() => toggleSeries(0));
  const options = _.cloneDeep(defaultOptions) as any;

  // Get the X-axis tick format
  const time = timefilter.getBounds() as any;
  const interval = calculateInterval(
    time.min.valueOf(),
    time.max.valueOf(),
    uiSettings.get('timelion:target_buckets') || 200,
    intervalProp,
    uiSettings.get('timelion:min_interval') || '1ms'
  );
  const format = getxAxisFormatter(interval);

  // Use moment to format ticks so we get timezone correction
  options.xaxis.tickFormatter = function (val: any) {
    return moment(val).format(format);
  };

  // Calculate how many ticks can fit on the axis
  const tickLetterWidth = 7;
  const tickPadding = 45;
  options.xaxis.ticks = Math.floor(
    elementRef.current
      ? elementRef.current.clientWidth
      : 0 / (format.length * tickLetterWidth + tickPadding)
  );

  const series = _.map(chart, function (serie: any, index) {
    serie = _.cloneDeep(
      _.defaults(serie, {
        shadowSize: 0,
        lines: {
          lineWidth: 3,
        },
      })
    );
    serie._id = index;

    if (serie.color) {
      const span = document.createElement('span');
      span.style.color = serie.color;
      serie.color = span.style.color;
    }

    if (serie._hide) {
      serie.data = [];
      serie.stack = false;
      // serie.color = "#ddd";
      serie.label = '(hidden) ' + serie.label;
    }

    if (serie._global) {
      _.merge(options, serie._global, function (objVal, srcVal) {
        // This is kind of gross, it means that you can't replace a global value with a null
        // best you can do is an empty string. Deal with it.
        if (objVal == null) return srcVal;
        if (srcVal == null) return objVal;
      });
    }

    return serie;
  });

  if (options.yaxes) {
    options.yaxes.forEach((yaxis: any) => {
      if (yaxis && yaxis.units) {
        yaxis.tickFormatter = formatters[yaxis.units.type];
        const byteModes = ['bytes', 'bytes/s'];
        if (byteModes.includes(yaxis.units.type)) {
          yaxis.tickGenerator = generateTicks;
        }
      }
    });
  }

  // @ts-ignore
  const plot =
    canvasElem.current &&
      canvasElem.current.clientHeight > 0 &&
      canvasElem.current.clientWidth > 0
      ? $.plot(canvasElem.current, compact(series), options)
      : null;

  moment.tz.setDefault(uiSettings.get('dateFormat:tz'));

  const clearLegendNumbers = () => {
    if (legendCaption) {
      legendCaption.html(emptyCaption);
    }
    each(legendValueNumbers, (num: any) => {
      $(num).empty();
    });
  };

  const plothoverHandler = (event: any, pos: any, item: any) => {
    if (!plot) {
      return;
    }
    plot.setCrosshair(item);
    debouncedSetLegendNumbers(item);
  };
  const mouseleaveHandler = () => {
    if (!plot) {
      return;
    }
    plot.clearCrosshair();
    clearLegendNumbers();
  };
  const plotselectedHandler = (event: any, ranges: any) => {
    timefilter.setTime({
      from: moment(ranges.xaxis.from),
      to: moment(ranges.xaxis.to),
    });
  };

  useEventListener(elementRef, 'plothover', plothoverHandler);
  useEventListener(elementRef, 'plotselected', plotselectedHandler);
  useEventListener(elementRef, 'mouseleave', mouseleaveHandler);

  const unhighlightSeries = () => {
    if (highlightedSeries === null) {
      return;
    }

    highlightedSeries = null;
    focusedSeries = null;
    chart.forEach((series: any) => {
      series.color = originalColorMap.get(series); // reset the colors
    });
    // drawPlot(chart);
  };

  // Shamelessly borrowed from the flotCrosshairs example
  const setLegendNumbers = (pos: any) => {
    unhighlightSeries();

    const axes = plot.getAxes();
    if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max) {
      return;
    }

    let i;
    const dataset = plot.getData();
    if (legendCaption) {
      legendCaption.text(
        moment(pos.x).format(get(dataset, '[0]._global.legend.timeFormat', DEFAULT_TIME_FORMAT))
      );
    }
    for (i = 0; i < dataset.length; ++i) {
      const series = dataset[i];
      const useNearestPoint = series.lines.show && !series.lines.steps;
      const precision = get(series, '_meta.precision', 2);

      if (series._hide) continue;

      const currentPoint = series.data.find((point: any, index: number) => {
        if (index + 1 === series.data.length) {
          return true;
        }
        if (useNearestPoint) {
          return pos.x - point[0] < series.data[index + 1][0] - pos.x;
        } else {
          return pos.x < series.data[index + 1][0];
        }
      });

      const y = currentPoint[1];

      if (y != null) {
        let label = y.toFixed(precision);
        if (series.yaxis.tickFormatter) {
          label = series.yaxis.tickFormatter(label, series.yaxis);
        }
        legendValueNumbers.eq(i).text(`(${label})`);
      } else {
        legendValueNumbers.eq(i).empty();
      }
    }
  };

  const debouncedSetLegendNumbers = debounce(setLegendNumbers, DEBOUNCE_DELAY, {
    maxWait: DEBOUNCE_DELAY,
    leading: true,
    trailing: false,
  });

  // setting originalColorMap
  chart.forEach((series: any, seriesIndex: any) => {
    if (!series.color) {
      const colorIndex = seriesIndex % defaultOptions.colors.length;
      series.color = defaultOptions.colors[colorIndex];
    }
    originalColorMap.set(series, series.color);
  });

  // const cancelResize = observeResize($elem, function() {
  //   drawPlot($scope.chart);
  // });

  // $scope.$on('$destroy', function() {
  //   cancelResize();
  //   $elem.off('plothover');
  //   $elem.off('plotselected');
  //   $elem.off('mouseleave');
  // });

  // const drawPlot = (plotConfig: any) => {

  // }

  // we can't use `$.plot` to draw the chart when the height or width is 0
  // so, we'll need another event to trigger drawPlot to actually draw it

  const title =
    (_(chart)
      .map('_title')
      .compact()
      .last() as any) || '';

  // // Used to toggle the series, and for displaying values on hover
  // legendValueNumbers =
  //   canvasElem && canvasElem.current && canvasElem.current.find('.ngLegendValueNumber');

  if (plot && get(plot.getData(), '[0]._global.legend.showTime', true)) {
    legendCaption = $('<caption class="timChart__legendCaption"></caption>');
    legendCaption.html(emptyCaption);
    // canvasElem.current.find('div.legend table').append(legendCaption);

    // legend has been re-created. Apply focus on legend element when previously set
    if (focusedSeries || focusedSeries === 0) {
      // const $legendLabels = canvasElem.current.find('div.legend table .legendLabel>span');
      //$legendLabels.get(focusedSeries).focus();
    }
  }

  return (
    <div className="timChart">
      <div ref={elementRef} className="chart-top-title">
        {title}
      </div>
      <div ref={canvasElem} className="chart-canvas" />
      {reactLegend}
    </div>
  );
}

export { Panel };
