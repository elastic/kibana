/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueBoxed,
} from '../../../expressions/public';
import { CategoryAxis } from '../types';
import { ExpressionValueScale } from './vis_scale';
import { ExpressionValueLabel } from './label';

export interface Arguments extends Omit<CategoryAxis, 'title' | 'scale' | 'labels'> {
  titleText?: string;
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
  help: i18n.translate('visTypeXY.function.categoryAxis.help', {
    defaultMessage: 'Generates category axis object',
  }),
  type: 'category_axis',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('visTypeXY.function.categoryAxis.id.help', {
        defaultMessage: 'Id of category axis',
      }),
      required: true,
    },
    show: {
      types: ['boolean'],
      help: i18n.translate('visTypeXY.function.categoryAxis.show.help', {
        defaultMessage: 'Show the category axis',
      }),
      required: true,
    },
    position: {
      types: ['string'],
      help: i18n.translate('visTypeXY.function.categoryAxis.position.help', {
        defaultMessage: 'Position of the category axis',
      }),
      required: true,
    },
    type: {
      types: ['string'],
      help: i18n.translate('visTypeXY.function.categoryAxis.type.help', {
        defaultMessage: 'Type of the category axis',
      }),
      required: true,
    },
    titleText: {
      types: ['string'],
      help: i18n.translate('visTypeXY.function.categoryAxis.titleText.help', {
        defaultMessage: 'Title text of the category axis',
      }),
    },
    scale: {
      types: ['vis_scale'],
      help: i18n.translate('visTypeXY.function.categoryAxis.scale.help', {
        defaultMessage: 'Scale config',
      }),
    },
    labels: {
      types: ['label'],
      help: i18n.translate('visTypeXY.function.categoryAxis.labels.help', {
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
        text: args.titleText,
      },
      scale: {
        ...args.scale,
        type: args.scale.scaleType,
      },
      labels: args.labels,
    };
  },
});
