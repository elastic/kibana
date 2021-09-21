/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionValueVisDimension } from './vis_dimension';

import type {
  ExpressionFunctionDefinition,
  ExpressionValueBoxed,
  Datatable,
  DatatableColumn,
  SerializedFieldFormat,
} from '../../../expressions/common';

export interface DateHistogramParams {
  date: boolean;
  interval?: number;
  intervalESValue?: number;
  intervalESUnit?: string;
  format: string;
  bounds?: {
    min: string | number;
    max: string | number;
  };
  integersOnly?: boolean;
}

export interface HistogramParams {
  interval: number;
  integersOnly?: boolean;
}

export interface FakeParams {
  defaultValue: string;
}

interface Arguments {
  visDimension: ExpressionValueVisDimension;
  params: string;
  aggType: string;
  label: string;
  id?: number | string;
}

export type ExpressionValueXYDimension = ExpressionValueBoxed<
  'xy_dimension',
  {
    label: string;
    aggType?: string;
    params: (DateHistogramParams | HistogramParams | FakeParams | {}) & { integersOnly?: boolean };
    accessor: number | DatatableColumn;
    format: SerializedFieldFormat;
    id?: number | string;
  }
>;

export const xyDimension = (): ExpressionFunctionDefinition<
  'xydimension',
  Datatable | null,
  Arguments,
  ExpressionValueXYDimension
> => ({
  name: 'xydimension',
  help: i18n.translate('visualizations.function.xydimension.help', {
    defaultMessage: 'Generates xy dimension object',
  }),
  type: 'xy_dimension',
  args: {
    visDimension: {
      types: ['vis_dimension'],
      help: i18n.translate('visualizations.function.xyDimension.visDimension.help', {
        defaultMessage: 'Dimension object config',
      }),
      required: true,
    },
    label: {
      types: ['string'],
      help: i18n.translate('visualizations.function.xyDimension.label.help', {
        defaultMessage: 'Label',
      }),
    },
    aggType: {
      types: ['string'],
      help: i18n.translate('visualizations.function.xyDimension.aggType.help', {
        defaultMessage: 'Aggregation type',
      }),
    },
    params: {
      types: ['string'],
      default: '"{}"',
      help: i18n.translate('visualizations.function.xyDimension.params.help', {
        defaultMessage: 'Params',
      }),
    },
    id: {
      types: ['string', 'number'],
      help: i18n.translate('visualizations.function.xyDimension.id.help', {
        defaultMessage: 'ID',
      }),
    },
  },
  fn: (context, args) => {
    return {
      type: 'xy_dimension',
      label: args.label,
      aggType: args.aggType,
      params: JSON.parse(args.params!),
      accessor: args.visDimension.accessor,
      format: args.visDimension.format,
      id: args.id,
    };
  },
});
