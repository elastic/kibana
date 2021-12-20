/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable } from '../../../../expressions/common';
import { PIE_LABELS_FUNCTION, PIE_LABELS_VALUE } from '../constants';
import { ExpressionValuePieLabels } from '../types/expression_functions';

interface Arguments {
  show: boolean;
  position: string;
  values: boolean;
  truncate: number | null;
  valuesFormat: string;
  lastLevel: boolean;
  percentDecimals: number;
}

export const pieLabelsFunction = (): ExpressionFunctionDefinition<
  typeof PIE_LABELS_FUNCTION,
  Datatable | null,
  Arguments,
  ExpressionValuePieLabels
> => ({
  name: PIE_LABELS_FUNCTION,
  help: i18n.translate('expressionPie.pieLabels.function.help', {
    defaultMessage: 'Generates the pie labels object',
  }),
  type: PIE_LABELS_VALUE,
  args: {
    show: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieLabels.function.args.pieLabels.show.help', {
        defaultMessage: 'Displays the pie labels',
      }),
      required: true,
    },
    position: {
      types: ['string'],
      default: 'default',
      help: i18n.translate('expressionPie.pieLabels.function.args.pieLabels.position.help', {
        defaultMessage: 'Defines the label position',
      }),
    },
    values: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieLabels.function.args.pieLabels.values.help', {
        defaultMessage: 'Displays the values inside the slices',
      }),
      default: true,
    },
    percentDecimals: {
      types: ['number'],
      help: i18n.translate('expressionPie.pieLabels.function.args.pieLabels.percentDecimals.help', {
        defaultMessage: 'Defines the number of decimals that will appear on the values as percent',
      }),
      default: 2,
    },
    lastLevel: {
      types: ['boolean'],
      help: i18n.translate('expressionPie.pieLabels.function.args.pieLabels.lastLevel.help', {
        defaultMessage: 'Show top level labels only',
      }),
      default: true,
    },
    truncate: {
      types: ['number'],
      help: i18n.translate('expressionPie.pieLabels.function.args.truncate.help', {
        defaultMessage: 'Defines the number of characters that the slice value will display',
      }),
      default: null,
    },
    valuesFormat: {
      types: ['string'],
      default: 'percent',
      help: i18n.translate('expressionPie.pieLabels.function.args.valuesFormat.help', {
        defaultMessage: 'Defines the format of the values',
      }),
    },
  },
  fn: (context, args) => {
    return {
      type: PIE_LABELS_VALUE,
      show: args.show,
      position: args.position,
      percentDecimals: args.percentDecimals,
      values: args.values,
      truncate: args.truncate,
      valuesFormat: args.valuesFormat,
      last_level: args.lastLevel,
    };
  },
});
