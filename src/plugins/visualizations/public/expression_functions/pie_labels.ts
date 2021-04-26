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

interface Arguments {
  show: boolean;
  position: string;
  values: boolean;
  truncate: number | null;
  valuesFormat: string;
  last_level: boolean;
}

export type ExpressionValuePieLabels = ExpressionValueBoxed<
  'pie_labels',
  {
    show: boolean;
    position: string;
    values: boolean;
    truncate: number | null;
    valuesFormat: string;
    last_level: boolean;
  }
>;

export const pieLabels = (): ExpressionFunctionDefinition<
  'pielabels',
  Datatable | null,
  Arguments,
  ExpressionValuePieLabels
> => ({
  name: 'pielabels',
  help: i18n.translate('visualizations.function.pieLabels.help', {
    defaultMessage: 'Generates the pie labels object',
  }),
  type: 'pie_labels',
  args: {
    show: {
      types: ['boolean'],
      help: i18n.translate('visualizations.function.pieLabels.show.help', {
        defaultMessage: 'Displays the pie labels',
      }),
      required: true,
    },
    position: {
      types: ['string'],
      default: 'default',
      help: i18n.translate('visualizations.function.pieLabels.position.help', {
        defaultMessage: 'Defines the label position',
      }),
    },
    values: {
      types: ['boolean'],
      help: i18n.translate('visualizations.function.pieLabels.values.help', {
        defaultMessage: 'Displays the values inside the slices',
      }),
      default: true,
    },
    last_level: {
      types: ['boolean'],
      help: i18n.translate('visualizations.function.pieLabels.values.help', {
        defaultMessage: 'Show top level labels only',
      }),
      default: true,
    },
    truncate: {
      types: ['number', 'null'],
      help: i18n.translate('visualizations.function.pieLabels.truncate.help', {
        defaultMessage: 'Defines the number of characters that the slice value will display',
      }),
      default: null,
    },
    valuesFormat: {
      types: ['string'],
      default: 'percent',
      help: i18n.translate('visualizations.function.pieLabels.valuesFormat.help', {
        defaultMessage: 'Defines the format of the values',
      }),
    },
  },
  fn: (context, args) => {
    return {
      type: 'pie_labels',
      show: args.show,
      position: args.position,
      values: args.values,
      truncate: args.truncate,
      valuesFormat: args.valuesFormat,
      last_level: args.last_level,
    };
  },
});
