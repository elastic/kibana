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

import { i18n } from '@kbn/i18n';

import { ColorMode, ColorSchemas, ColorSchemaParams, Labels, Style } from '../../charts/public';
import { RangeValues, Schemas } from '../../vis_default_editor/public';
import { AggGroupNames } from '../../data/public';
import { BaseVisTypeOptions } from '../../visualizations/public';

import { Alignment, GaugeType, BasicVislibParams, VislibChartType } from './types';
import { getGaugeCollections } from './editor';
import { toExpressionAst } from './to_ast';
import { GaugeOptions } from './editor/components';

export interface Gauge extends ColorSchemaParams {
  backStyle: 'Full';
  gaugeStyle: 'Full';
  orientation: 'vertical';
  type: 'meter';
  alignment: Alignment;
  colorsRange: RangeValues[];
  extendRange: boolean;
  gaugeType: GaugeType;
  labels: Labels;
  percentageMode: boolean;
  outline?: boolean;
  scale: {
    show: boolean;
    labels: false;
    color: 'rgba(105,112,125,0.2)';
  };
  style: Style;
}

export interface GaugeVisParams {
  type: 'gauge';
  addTooltip: boolean;
  addLegend: boolean;
  isDisplayWarning: boolean;
  gauge: Gauge;
}

export const gaugeVisTypeDefinition: BaseVisTypeOptions<BasicVislibParams> = {
  name: 'gauge',
  title: i18n.translate('visTypeVislib.gauge.gaugeTitle', { defaultMessage: 'Gauge' }),
  icon: 'visGauge',
  description: i18n.translate('visTypeVislib.gauge.gaugeDescription', {
    defaultMessage: 'Gauges indicate the status of a metric.',
  }),
  toExpressionAst,
  visConfig: {
    defaults: {
      type: VislibChartType.Gauge,
      addTooltip: true,
      addLegend: true,
      isDisplayWarning: false,
      gauge: {
        alignment: Alignment.Automatic,
        extendRange: true,
        percentageMode: false,
        gaugeType: GaugeType.Arc,
        gaugeStyle: 'Full',
        backStyle: 'Full',
        orientation: 'vertical',
        colorSchema: ColorSchemas.GreenToRed,
        gaugeColorMode: ColorMode.Labels,
        colorsRange: [
          { from: 0, to: 50 },
          { from: 50, to: 75 },
          { from: 75, to: 100 },
        ],
        invertColors: false,
        labels: {
          show: true,
          color: 'black',
        },
        scale: {
          show: true,
          labels: false,
          color: 'rgba(105,112,125,0.2)',
        },
        type: 'meter',
        style: {
          bgWidth: 0.9,
          width: 0.9,
          mask: false,
          bgMask: false,
          maskBars: 50,
          bgFill: 'rgba(105,112,125,0.2)',
          bgColor: true,
          subText: '',
          fontSize: 60,
        },
      },
    },
  },
  editorConfig: {
    collections: getGaugeCollections(),
    optionsTemplate: GaugeOptions,
    schemas: new Schemas([
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeVislib.gauge.metricTitle', { defaultMessage: 'Metric' }),
        min: 1,
        aggFilter: [
          '!std_dev',
          '!geo_centroid',
          '!percentiles',
          '!percentile_ranks',
          '!derivative',
          '!serial_diff',
          '!moving_avg',
          '!cumulative_sum',
          '!geo_bounds',
        ],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('visTypeVislib.gauge.groupTitle', {
          defaultMessage: 'Split group',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
    ]),
  },
  useCustomNoDataScreen: true,
};
