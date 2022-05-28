/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/public';
import type { CategoryAxis } from '../types';
import type { ExpressionValueScale } from './vis_scale';
import type { ExpressionValueLabel } from './label';

export interface Arguments extends Omit<CategoryAxis, 'title' | 'scale' | 'labels'> {
  title?: string;
  scale: ExpressionValueScale;
  labels: ExpressionValueLabel;
}

export type ExpressionValueCategoryAxis = ExpressionValueBoxed<
  'category_axis',
  {
    id: CategoryAxis['id'];
    show: CategoryAxis['show'];
    position: CategoryAxis['position'];
    axisType: CategoryAxis['type'];
    title: {
      text?: string;
    };
    labels: CategoryAxis['labels'];
    scale: CategoryAxis['scale'];
  }
>;

export const categoryAxis = (): ExpressionFunctionDefinition<
  'categoryaxis',
  Datatable | null,
  Arguments,
  ExpressionValueCategoryAxis
> => ({
  name: 'categoryaxis',
  help: i18n.translate('visTypeXy.function.categoryAxis.help', {
    defaultMessage: 'Generates category axis object',
  }),
  type: 'category_axis',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.categoryAxis.id.help', {
        defaultMessage: 'Id of category axis',
      }),
      required: true,
    },
    show: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.categoryAxis.show.help', {
        defaultMessage: 'Show the category axis',
      }),
      required: true,
    },
    position: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.categoryAxis.position.help', {
        defaultMessage: 'Position of the category axis',
      }),
      required: true,
    },
    type: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.categoryAxis.type.help', {
        defaultMessage: 'Type of the category axis. Can be category or value',
      }),
      required: true,
    },
    title: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.categoryAxis.title.help', {
        defaultMessage: 'Title of the category axis',
      }),
    },
    scale: {
      types: ['vis_scale'],
      help: i18n.translate('visTypeXy.function.categoryAxis.scale.help', {
        defaultMessage: 'Scale config',
      }),
    },
    labels: {
      types: ['label'],
      help: i18n.translate('visTypeXy.function.categoryAxis.labels.help', {
        defaultMessage: 'Axis label config',
      }),
    },
  },
  fn: (context, args) => {
    return {
      type: 'category_axis',
      id: args.id,
      show: args.show,
      position: args.position,
      axisType: args.type,
      title: {
        text: args.title,
      },
      scale: {
        ...args.scale,
        type: args.scale.scaleType,
      },
      labels: args.labels,
    };
  },
});
