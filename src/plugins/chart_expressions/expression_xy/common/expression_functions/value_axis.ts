/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition, Datatable } from '../../../../expressions/public';
import { ExpressionValueValueAxis, ExpressionValueValueAxisArguments } from '../types';

export const valueAxis = (): ExpressionFunctionDefinition<
  'valueaxis',
  Datatable | null,
  ExpressionValueValueAxisArguments,
  ExpressionValueValueAxis
> => ({
  name: 'valueaxis',
  help: i18n.translate('expressionXy.function.valueaxis.help', {
    defaultMessage: 'Generates value axis object',
  }),
  type: 'value_axis',
  args: {
    name: {
      types: ['string'],
      help: i18n.translate('expressionXy.function.valueAxis.name.help', {
        defaultMessage: 'Name of value axis',
      }),
      required: true,
    },
    axisParams: {
      types: ['category_axis'],
      help: i18n.translate('expressionXy.function.valueAxis.axisParams.help', {
        defaultMessage: 'Value axis params',
      }),
      required: true,
    },
  },
  fn: (context, args) => {
    return {
      type: 'value_axis',
      name: args.name,
      id: args.axisParams.id,
      show: args.axisParams.show,
      position: args.axisParams.position,
      axisType: args.axisParams.axisType,
      title: args.axisParams.title,
      scale: args.axisParams.scale,
      labels: args.axisParams.labels,
    };
  },
});
