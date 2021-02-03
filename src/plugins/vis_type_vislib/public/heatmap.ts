/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';

import { RangeValues } from '../../vis_default_editor/public';
import { AggGroupNames } from '../../data/public';
import { ColorSchemas, ColorSchemaParams } from '../../charts/public';
import { VIS_EVENT_TO_TRIGGER, VisTypeDefinition } from '../../visualizations/public';
import { ValueAxis, ScaleType, AxisType } from '../../vis_type_xy/public';

import { HeatmapOptions, getHeatmapCollections } from './editor';
import { TimeMarker } from './vislib/visualizations/time_marker';
import { CommonVislibParams, VislibChartType } from './types';
import { toExpressionAst } from './to_ast';

export interface HeatmapVisParams extends CommonVislibParams, ColorSchemaParams {
  type: 'heatmap';
  addLegend: boolean;
  enableHover: boolean;
  colorsNumber: number | '';
  colorsRange: RangeValues[];
  valueAxes: ValueAxis[];
  setColorRange: boolean;
  percentageMode: boolean;
  times: TimeMarker[];
}

export const heatmapVisTypeDefinition: VisTypeDefinition<HeatmapVisParams> = {
  name: 'heatmap',
  title: i18n.translate('visTypeVislib.heatmap.heatmapTitle', { defaultMessage: 'Heat map' }),
  icon: 'heatmap',
  description: i18n.translate('visTypeVislib.heatmap.heatmapDescription', {
    defaultMessage: 'Shade data in cells in a matrix.',
  }),
  toExpressionAst,
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter],
  visConfig: {
    defaults: {
      type: VislibChartType.Heatmap,
      addTooltip: true,
      addLegend: true,
      enableHover: false,
      legendPosition: Position.Right,
      times: [],
      colorsNumber: 4,
      colorSchema: ColorSchemas.Greens,
      setColorRange: false,
      colorsRange: [],
      invertColors: false,
      percentageMode: false,
      valueAxes: [
        {
          show: false,
          id: 'ValueAxis-1',
          type: AxisType.Value,
          scale: {
            type: ScaleType.Linear,
            defaultYExtents: false,
          },
          labels: {
            show: false,
            rotate: 0,
            overwriteColor: false,
            color: 'black',
          },
        },
      ],
    },
  },
  editorConfig: {
    collections: getHeatmapCollections(),
    optionsTemplate: HeatmapOptions,
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeVislib.heatmap.metricTitle', { defaultMessage: 'Value' }),
        min: 1,
        max: 1,
        aggFilter: [
          'count',
          'avg',
          'median',
          'sum',
          'min',
          'max',
          'cardinality',
          'std_dev',
          'top_hits',
        ],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('visTypeVislib.heatmap.segmentTitle', {
          defaultMessage: 'X-axis',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('visTypeVislib.heatmap.groupTitle', { defaultMessage: 'Y-axis' }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypeVislib.heatmap.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
    ],
  },
  requiresSearch: true,
};
