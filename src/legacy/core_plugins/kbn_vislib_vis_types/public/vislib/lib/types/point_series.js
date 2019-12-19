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

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

function getSeriId(seri) {
  return seri.id && seri.id.indexOf('.') !== -1 ? seri.id.split('.')[0] : seri.id;
}

const createSeriesFromParams = (cfg, seri) => {
  //percentile data id format is {mainId}.{percentileValue}, this has to be cleaned
  //up to match with ids in cfg.seriesParams entry that contain only {mainId}
  const seriId = getSeriId(seri);
  const matchingSeriesParams = cfg.seriesParams
    ? cfg.seriesParams.find(seriConfig => {
        return seriId === seriConfig.data.id;
      })
    : null;

  const interpolate = cfg.smoothLines ? 'cardinal' : cfg.interpolate;

  if (!matchingSeriesParams) {
    const seriesParams0 =
      Array.isArray(cfg.seriesParams) && cfg.seriesParams[0] ? cfg.seriesParams[0] : cfg;
    const stacked = ['stacked', 'percentage', 'wiggle', 'silhouette'].includes(cfg.mode);
    return {
      show: true,
      type: cfg.type || 'line',
      mode: stacked ? 'stacked' : 'normal',
      interpolate: interpolate,
      drawLinesBetweenPoints: seriesParams0.drawLinesBetweenPoints,
      showCircles: seriesParams0.showCircles,
      radiusRatio: cfg.radiusRatio,
      data: seri,
    };
  }

  return {
    ...matchingSeriesParams,
    data: seri,
    radiusRatio: cfg.radiusRatio,
  };
};

const createSeries = (cfg, series) => {
  return {
    type: 'point_series',
    addTimeMarker: cfg.addTimeMarker,
    series: _.map(series, seri => {
      return createSeriesFromParams(cfg, seri);
    }),
  };
};

const createCharts = (cfg, data) => {
  if (data.rows || data.columns) {
    const charts = data.rows ? data.rows : data.columns;
    return charts.map(chart => {
      return createSeries(cfg, chart.series);
    });
  }

  return [createSeries(cfg, data.series)];
};
/*
 * Create handlers for Area, Column, and Line charts which
 * are all nearly the same minus a few details
 */
function create(opts) {
  opts = opts || {};

  return function(cfg, data) {
    const isUserDefinedYAxis = cfg.setYExtents;
    const defaultYExtents = cfg.defaultYExtents;
    const config = _.cloneDeep(cfg);
    _.defaultsDeep(
      config,
      {
        chartTitle: {},
        mode: 'normal',
      },
      opts
    );

    config.type = 'point_series';

    if (!config.tooltip) {
      config.tooltip = {
        show: cfg.addTooltip,
      };
    }

    if (!config.valueAxes) {
      let mode = config.mode;
      if (['stacked', 'overlap'].includes(mode)) mode = 'normal';
      config.valueAxes = [
        {
          id: 'ValueAxis-1',
          type: 'value',
          scale: {
            type: config.scale,
            setYExtents: config.setYExtents,
            defaultYExtents: config.defaultYExtents,
            boundsMargin: defaultYExtents ? config.boundsMargin : 0,
            min: isUserDefinedYAxis ? config.yAxis.min : undefined,
            max: isUserDefinedYAxis ? config.yAxis.max : undefined,
            mode: mode,
          },
          labels: {
            axisFormatter: data.data.yAxisFormatter || data.get('yAxisFormatter'),
          },
          title: {
            text: data.get('yAxisLabel'),
          },
        },
      ];
    } else {
      config.valueAxes.forEach(axis => {
        if (axis.labels) {
          axis.labels.axisFormatter = data.data.yAxisFormatter || data.get('yAxisFormatter');
          const seriesParams =
            config.seriesParams &&
            config.seriesParams.find(seriesParams => seriesParams.valueAxis === axis.id);
          // if there are series assigned to this axis, get the format from the first one
          if (seriesParams) {
            const seriesDataId = seriesParams.data.id;
            const series = (data.data.series || data.get('series')).find(
              series => getSeriId(series) === seriesDataId
            );
            if (series) {
              axis.labels.axisFormatter = series.yAxisFormatter;
            }
          }
        }
      });
    }

    if (!config.categoryAxes) {
      config.categoryAxes = [
        {
          id: 'CategoryAxis-1',
          type: 'category',
          labels: {
            axisFormatter: data.data.xAxisFormatter || data.get('xAxisFormatter'),
          },
          scale: {
            expandLastBucket: opts.expandLastBucket,
          },
          title: {
            text: data.get('xAxisLabel'),
          },
        },
      ];
    } else {
      const categoryAxis1 = config.categoryAxes.find(categoryAxis => {
        return categoryAxis.id === 'CategoryAxis-1';
      });
      if (categoryAxis1) {
        categoryAxis1.title.text = data.get('xAxisLabel');
      }
    }

    if (!config.charts) {
      config.charts = createCharts(cfg, data.data);
    }

    if (typeof config.enableHover === 'undefined') config.enableHover = true;

    return config;
  };
}

export const vislibPointSeriesTypes = {
  line: create(),

  column: create({
    expandLastBucket: true,
  }),

  area: create({
    alerts: [
      {
        type: 'warning',
        msg:
          'Positive and negative values are not accurately represented by stacked ' +
          'area charts. Either changing the chart mode to "overlap" or using a ' +
          'bar chart is recommended.',
        test: function(vis, data) {
          if (!data.shouldBeStacked() || data.maxNumberOfSeries() < 2) return;

          const hasPos = data.getYMax(data._getY) > 0;
          const hasNeg = data.getYMin(data._getY) < 0;
          return hasPos && hasNeg;
        },
      },
      {
        type: 'warning',
        msg:
          'Parts of or the entire area chart might not be displayed due to null ' +
          'values in the data. A line chart is recommended when displaying data ' +
          'with null values.',
        test: function(vis, data) {
          return data.hasNullValues();
        },
      },
    ],
  }),

  heatmap: (cfg, data) => {
    const defaults = create()(cfg, data);
    const hasCharts = defaults.charts.length;
    const tooManySeries =
      defaults.charts.length && defaults.charts[0].series.length > cfg.heatmapMaxBuckets;
    if (hasCharts && tooManySeries) {
      defaults.error = i18n.translate('kbnVislibVisTypes.vislib.heatmap.maxBucketsText', {
        defaultMessage:
          'There are too many series defined ({nr}). The configured maximum is {max}.',
        values: {
          max: cfg.heatmapMaxBuckets,
          nr: defaults.charts[0].series.length,
        },
        description: 'This message appears at heatmap visualizations',
      });
    }
    defaults.valueAxes[0].show = false;
    defaults.categoryAxes[0].style = {
      rangePadding: 0,
      rangeOuterPadding: 0,
    };
    defaults.categoryAxes.push({
      id: 'CategoryAxis-2',
      type: 'category',
      position: 'left',
      values: data.getLabels(),
      scale: {
        inverted: true,
      },
      labels: {
        filter: false,
        axisFormatter: function(val) {
          return val;
        },
      },
      style: {
        rangePadding: 0,
        rangeOuterPadding: 0,
      },
      title: {
        text: data.get('zAxisLabel') || '',
      },
    });
    return defaults;
  },
};
