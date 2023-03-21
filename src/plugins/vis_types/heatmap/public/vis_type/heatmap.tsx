/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';

import { AggGroupNames } from '@kbn/data-plugin/public';
import { ColorSchemas } from '@kbn/charts-plugin/public';
import { VIS_EVENT_TO_TRIGGER, VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import { HeatmapTypeProps, HeatmapVisParams, AxisType, ScaleType } from '../types';
import { toExpressionAst } from '../to_ast';
import { getHeatmapOptions } from '../editor/components';
import { SplitTooltip } from './split_tooltip';
import { convertToLens } from '../convert_to_lens';

export const getHeatmapVisTypeDefinition = ({
  showElasticChartsOptions = false,
  palettes,
}: HeatmapTypeProps): VisTypeDefinition<HeatmapVisParams> => ({
  name: 'heatmap',
  title: i18n.translate('visTypeHeatmap.heatmap.heatmapTitle', { defaultMessage: 'Heat map' }),
  icon: 'heatmap',
  description: i18n.translate('visTypeHeatmap.heatmap.heatmapDescription', {
    defaultMessage: 'Display values as colors in a matrix.',
  }),
  fetchDatatable: true,
  toExpressionAst,
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter],
  visConfig: {
    defaults: {
      type: 'heatmap',
      addTooltip: true,
      addLegend: true,
      enableHover: false,
      legendPosition: Position.Right,
      colorsNumber: 4,
      colorSchema: ColorSchemas.GreenToRed,
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
    enableDataViewChange: true,
    optionsTemplate: getHeatmapOptions({
      showElasticChartsOptions,
      palettes,
    }),
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeHeatmap.heatmap.metricTitle', { defaultMessage: 'Value' }),
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
          '!filtered_metric',
          '!single_percentile',
          '!single_percentile_rank',
        ],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('visTypeHeatmap.heatmap.segmentTitle', {
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
        title: i18n.translate('visTypeHeatmap.heatmap.groupTitle', { defaultMessage: 'Y-axis' }),
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
        name: 'split',
        // TODO: Remove when split chart aggs are supported
        ...(showElasticChartsOptions && {
          disabled: true,
          tooltip: <SplitTooltip />,
        }),
        title: i18n.translate('visTypeHeatmap.heatmap.splitTitle', {
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
  navigateToLens: async (vis, timefilter) => (vis ? convertToLens(vis, timefilter) : null),
  getExpressionVariables: async (vis, timeFilter) => {
    return {
      canNavigateToLens: Boolean(vis?.params ? await convertToLens(vis, timeFilter) : null),
    };
  },
});
