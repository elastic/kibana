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

import React from 'react';

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';
import { Position, Fit } from '@elastic/charts';

import { Schemas } from '../../../vis_default_editor/public';
import { AggGroupNames } from '../../../data/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../visualizations/public';
import { defaultCountLabel, LabelRotation } from '../../../charts/public';

import {
  ChartMode,
  AxisType,
  ScaleType,
  AxisMode,
  ThresholdLineStyle,
  InterpolationMode,
  XyVisTypeDefinition,
} from '../types';
import { toExpressionAst } from '../to_ast';
import { ChartType } from '../../common';
import { getConfigCollections } from '../editor/collections';
import { getOptionTabs } from '../editor/common_config';
import { SplitTooltip } from './split_tooltip';

export const getLineVisTypeDefinition = (
  showElasticChartsOptions = false
): XyVisTypeDefinition => ({
  name: 'line',
  title: i18n.translate('visTypeXy.line.lineTitle', { defaultMessage: 'Line' }),
  icon: 'visLine',
  description: i18n.translate('visTypeXy.line.lineDescription', {
    defaultMessage: 'Emphasize trends',
  }),
  toExpressionAst,
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush],
  visConfig: {
    defaults: {
      type: ChartType.Line,
      grid: {
        categoryLines: false,
      },
      categoryAxes: [
        {
          id: 'CategoryAxis-1',
          type: AxisType.Category,
          position: Position.Bottom,
          show: true,
          scale: {
            type: ScaleType.Linear,
          },
          labels: {
            show: true,
            filter: true,
            truncate: 100,
          },
          title: {},
          style: {},
        },
      ],
      valueAxes: [
        {
          id: 'ValueAxis-1',
          name: 'LeftAxis-1',
          type: AxisType.Value,
          position: Position.Left,
          show: true,
          scale: {
            type: ScaleType.Linear,
            mode: AxisMode.Normal,
          },
          labels: {
            show: true,
            rotate: LabelRotation.Horizontal,
            filter: false,
            truncate: 100,
          },
          title: {
            text: defaultCountLabel,
          },
          style: {},
        },
      ],
      seriesParams: [
        {
          show: true,
          type: ChartType.Line,
          mode: ChartMode.Normal,
          data: {
            label: defaultCountLabel,
            id: '1',
          },
          valueAxis: 'ValueAxis-1',
          drawLinesBetweenPoints: true,
          lineWidth: 2,
          interpolate: InterpolationMode.Linear,
          showCircles: true,
        },
      ],
      addTooltip: true,
      detailedTooltip: true,
      addLegend: true,
      legendPosition: Position.Right,
      fittingFunction: Fit.Linear,
      times: [],
      addTimeMarker: false,
      labels: {},
      radiusRatio: 9,
      thresholdLine: {
        show: false,
        value: 10,
        width: 1,
        style: ThresholdLineStyle.Full,
        color: euiPaletteColorBlind()[9],
      },
    },
  },
  editorConfig: {
    collections: getConfigCollections(),
    optionTabs: getOptionTabs(showElasticChartsOptions),
    schemas: new Schemas([
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeXy.line.metricTitle', { defaultMessage: 'Y-axis' }),
        min: 1,
        aggFilter: ['!geo_centroid', '!geo_bounds'],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Metrics,
        name: 'radius',
        title: i18n.translate('visTypeXy.line.radiusTitle', { defaultMessage: 'Dot size' }),
        min: 0,
        max: 1,
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('visTypeXy.line.segmentTitle', { defaultMessage: 'X-axis' }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('visTypeXy.line.groupTitle', {
          defaultMessage: 'Split series',
        }),
        min: 0,
        max: 3,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypeXy.line.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
        // TODO: Remove when split chart aggs are supported
        // https://github.com/elastic/kibana/issues/82496
        ...(showElasticChartsOptions && {
          disabled: true,
          tooltip: <SplitTooltip />,
        }),
      },
    ]),
  },
});
