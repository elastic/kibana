/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';
import { Position } from '@elastic/charts';

import { AggGroupNames } from '../../../data/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../visualizations/public';

import {
  ChartMode,
  AxisType,
  ScaleType,
  AxisMode,
  ThresholdLineStyle,
  XyVisTypeDefinition,
  InterpolationMode,
} from '../types';
import { toExpressionAst } from '../to_ast';
import { ChartType } from '../../common';
import { getConfigCollections } from '../editor/collections';
import { getOptionTabs } from '../editor/common_config';
import { defaultCountLabel, LabelRotation } from '../../../charts/public';

export const getHorizontalBarVisTypeDefinition = (
  showElasticChartsOptions = false
): XyVisTypeDefinition => ({
  name: 'horizontal_bar',
  title: i18n.translate('visTypeXy.horizontalBar.horizontalBarTitle', {
    defaultMessage: 'Horizontal bar',
  }),
  icon: 'visBarHorizontal',
  description: i18n.translate('visTypeXy.horizontalBar.horizontalBarDescription', {
    defaultMessage: 'Present data in horizontal bars on an axis.',
  }),
  toExpressionAst,
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush],
  visConfig: {
    defaults: {
      type: ChartType.Histogram,
      grid: {
        categoryLines: false,
      },
      categoryAxes: [
        {
          id: 'CategoryAxis-1',
          type: AxisType.Category,
          position: Position.Left,
          show: true,
          scale: {
            type: ScaleType.Linear,
          },
          labels: {
            show: true,
            rotate: LabelRotation.Horizontal,
            filter: false,
            truncate: 200,
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
          position: Position.Bottom,
          show: true,
          scale: {
            type: ScaleType.Linear,
            mode: AxisMode.Normal,
          },
          labels: {
            show: true,
            rotate: LabelRotation.Angled,
            filter: true,
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
          type: ChartType.Histogram,
          mode: ChartMode.Normal,
          data: {
            label: defaultCountLabel,
            id: '1',
          },
          interpolate: InterpolationMode.Linear,
          valueAxis: 'ValueAxis-1',
          drawLinesBetweenPoints: true,
          lineWidth: 2,
          showCircles: true,
        },
      ],
      addTooltip: true,
      detailedTooltip: true,
      palette: {
        type: 'palette',
        name: 'default',
      },
      addLegend: true,
      legendPosition: Position.Right,
      times: [],
      addTimeMarker: false,
      labels: {},
      radiusRatio: 0,
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
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeXy.horizontalBar.metricTitle', {
          defaultMessage: 'Y-axis',
        }),
        min: 1,
        aggFilter: ['!geo_centroid', '!geo_bounds'],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Metrics,
        name: 'radius',
        title: i18n.translate('visTypeXy.horizontalBar.radiusTitle', {
          defaultMessage: 'Dot size',
        }),
        min: 0,
        max: 1,
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('visTypeXy.horizontalBar.segmentTitle', {
          defaultMessage: 'X-axis',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('visTypeXy.horizontalBar.groupTitle', {
          defaultMessage: 'Split series',
        }),
        min: 0,
        max: 3,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypeXy.horizontalBar.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
    ],
  },
  requiresSearch: true,
});
