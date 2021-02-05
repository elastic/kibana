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
import { AggGroupNames } from '../../../data/public';
import { VIS_EVENT_TO_TRIGGER, VisTypeDefinition } from '../../../visualizations/public';
import { PieVisParams, LabelPositions, ValueFormats, PieTypeProps } from '../types';
import { toExpressionAst } from '../to_ast';
import { getPieOptions } from '../editor/components';
import { SplitTooltip } from './split_tooltip';

export const getPieVisTypeDefinition = ({
  showElasticChartsOptions = false,
  palettes,
  trackUiMetric,
}: PieTypeProps): VisTypeDefinition<PieVisParams> => ({
  name: 'pie',
  title: i18n.translate('visTypePie.pie.pieTitle', { defaultMessage: 'Pie' }),
  icon: 'visPie',
  description: i18n.translate('visTypePie.pie.pieDescription', {
    defaultMessage: 'Compare data in proportion to a whole.',
  }),
  toExpressionAst,
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter],
  visConfig: {
    defaults: {
      type: 'pie',
      addTooltip: true,
      addLegend: true,
      legendPosition: Position.Right,
      nestedLegend: false,
      isDonut: true,
      palette: {
        type: 'palette',
        name: 'default',
      },
      labels: {
        show: true,
        last_level: true,
        values: true,
        valuesFormat: ValueFormats.PERCENT,
        truncate: 100,
        position: LabelPositions.DEFAULT,
      },
    },
  },
  editorConfig: {
    optionsTemplate: getPieOptions({
      showElasticChartsOptions,
      palettes,
      trackUiMetric,
    }),
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypePie.pie.metricTitle', {
          defaultMessage: 'Slice size',
        }),
        min: 1,
        max: 1,
        aggFilter: ['sum', 'count', 'cardinality', 'top_hits'],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('visTypePie.pie.segmentTitle', {
          defaultMessage: 'Split slices',
        }),
        min: 0,
        max: Infinity,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypePie.pie.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        mustBeFirst: true,
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
        // TODO: Remove when split chart aggs are supported
        ...(showElasticChartsOptions && {
          disabled: true,
          tooltip: <SplitTooltip />,
        }),
      },
    ],
  },
  hierarchicalData: true,
  requiresSearch: true,
});
