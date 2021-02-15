/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { AggGroupNames } from '../../data/public';
import { Schemas } from '../../vis_default_editor/public';
import { PieOptions } from './components/options';
import { getPositions, Positions } from './utils/collections';
import { CommonVislibParams } from './types';
import { BaseVisTypeOptions, VIS_EVENT_TO_TRIGGER } from '../../../plugins/visualizations/public';
import { toExpressionAst } from './to_ast_pie';

export interface PieVisParams extends CommonVislibParams {
  type: 'pie';
  isDonut: boolean;
  labels: {
    show: boolean;
    values: boolean;
    last_level: boolean;
    truncate: number | null;
  };
}

export const pieVisTypeDefinition: BaseVisTypeOptions<PieVisParams> = {
  name: 'pie',
  title: i18n.translate('visTypeVislib.pie.pieTitle', { defaultMessage: 'Pie' }),
  icon: 'visPie',
  description: i18n.translate('visTypeVislib.pie.pieDescription', {
    defaultMessage: 'Compare data in proportion to a whole.',
  }),
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter],
  toExpressionAst,
  visConfig: {
    defaults: {
      type: 'pie',
      addTooltip: true,
      addLegend: true,
      legendPosition: Positions.RIGHT,
      isDonut: true,
      labels: {
        show: false,
        values: true,
        last_level: true,
        truncate: 100,
      },
    },
  },
  editorConfig: {
    collections: {
      legendPositions: getPositions(),
    },
    optionsTemplate: PieOptions,
    schemas: new Schemas([
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeVislib.pie.metricTitle', {
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
        title: i18n.translate('visTypeVislib.pie.segmentTitle', {
          defaultMessage: 'Split slices',
        }),
        min: 0,
        max: Infinity,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypeVislib.pie.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        mustBeFirst: true,
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
    ]),
  },
  hierarchicalData: true,
  responseHandler: 'vislib_slices',
};
