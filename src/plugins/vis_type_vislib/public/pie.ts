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
import { Position } from '@elastic/charts';

import { AggGroupNames } from '../../data/public';
import { Schemas } from '../../vis_default_editor/public';
import { BaseVisTypeOptions, VIS_EVENT_TO_TRIGGER } from '../../visualizations/public';
import { getPositions } from '../../vis_type_xy/public';

import { CommonVislibParams } from './types';
import { PieOptions } from './editor';
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
      legendPosition: Position.Right,
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
