/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';
import { Position } from '@elastic/charts';

import { DEFAULT_LEGEND_SIZE } from '../../../../vis_default_editor/public';
import { AggGroupNames } from '../../../../data/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../visualizations/public';

import {
  ChartMode,
  AxisType,
  ScaleType,
  AxisMode,
  ThresholdLineStyle,
  InterpolationMode,
} from '../types';
import { toExpressionAst } from '../to_ast';
import { ChartType } from '../../common';
import { optionTabs } from '../editor/common_config';
import { defaultCountLabel, LabelRotation } from '../../../../charts/public';
import { getVisTypeFromParams } from './get_vis_type_from_params';

export const histogramVisTypeDefinition = {
  name: 'histogram',
  title: i18n.translate('visTypeXy.histogram.histogramTitle', {
    defaultMessage: 'Vertical bar',
  }),
  icon: 'visBarVertical',
  description: i18n.translate('visTypeXy.histogram.histogramDescription', {
    defaultMessage: 'Present data in vertical bars on an axis.',
  }),
  toExpressionAst,
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush],
  updateVisTypeOnParamsChange: getVisTypeFromParams,
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
            filter: true,
            truncate: 100,
          },
          title: {
            text: '',
          },
          style: {},
        },
      ],
      seriesParams: [
        {
          show: true,
          type: ChartType.Histogram,
          mode: ChartMode.Stacked,
          data: {
            label: defaultCountLabel,
            id: '1',
          },
          interpolate: InterpolationMode.Linear,
          valueAxis: 'ValueAxis-1',
          drawLinesBetweenPoints: true,
          lineWidth: 2,
          showCircles: true,
          circlesRadius: 1,
        },
      ],
      radiusRatio: 0,
      addTooltip: true,
      detailedTooltip: true,
      palette: {
        type: 'palette',
        name: 'default',
      },
      addLegend: true,
      legendPosition: Position.Right,
      legendSize: DEFAULT_LEGEND_SIZE,
      times: [],
      addTimeMarker: false,
      truncateLegend: true,
      maxLegendLines: 1,
      labels: {
        show: false,
      },
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
    optionTabs,
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeXy.histogram.metricTitle', {
          defaultMessage: 'Y-axis',
        }),
        min: 1,
        aggFilter: ['!geo_centroid', '!geo_bounds', '!filtered_metric', '!single_percentile'],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Metrics,
        name: 'radius',
        title: i18n.translate('visTypeXy.histogram.radiusTitle', {
          defaultMessage: 'Dot size',
        }),
        min: 0,
        max: 1,
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('visTypeXy.histogram.segmentTitle', {
          defaultMessage: 'X-axis',
        }),
        min: 0,
        max: 1,
        aggFilter: [
          '!geohash_grid',
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!rare_terms',
          '!multi_terms',
          '!significant_text',
        ],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('visTypeXy.histogram.groupTitle', {
          defaultMessage: 'Split series',
        }),
        min: 0,
        max: 3,
        aggFilter: [
          '!geohash_grid',
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!rare_terms',
          '!multi_terms',
          '!significant_text',
        ],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypeXy.histogram.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        min: 0,
        max: 1,
        aggFilter: [
          '!geohash_grid',
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!rare_terms',
          '!multi_terms',
          '!significant_text',
        ],
      },
    ],
  },
  requiresSearch: true,
};
