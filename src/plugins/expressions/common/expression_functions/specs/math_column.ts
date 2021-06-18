/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { math, MathArguments } from './math';
import { Datatable, DatatableColumn, getType } from '../../expression_types';

export type MathColumnArguments = MathArguments & {
  id: string;
  name?: string;
  copyMetaFrom?: string | null;
};

export const mathColumn: ExpressionFunctionDefinition<
  'mathColumn',
  Datatable,
  MathColumnArguments,
  Datatable
> = {
  name: 'mathColumn',
  type: 'datatable',
  inputTypes: ['datatable'],
  help: i18n.translate('expressions.functions.mathColumnHelpText', {
    defaultMessage:
      'Adds a column calculated as the result of other columns. ' +
      'Changes are made only when you provide arguments.' +
      'See also {alterColumnFn} and {staticColumnFn}.',
    values: {
      alterColumnFn: '`alterColumn`',
      staticColumnFn: '`staticColumn`',
    },
  }),
  args: {
    ...math.args,
    id: {
      types: ['string'],
      help: i18n.translate('expressions.functions.mathColumn.args.idHelpText', {
        defaultMessage: 'id of the resulting column. Must be unique.',
      }),
      required: true,
    },
    name: {
      types: ['string'],
      aliases: ['_', 'column'],
      help: i18n.translate('expressions.functions.mathColumn.args.nameHelpText', {
        defaultMessage: 'The name of the resulting column. Names are not required to be unique.',
      }),
      required: true,
    },
    copyMetaFrom: {
      types: ['string', 'null'],
      help: i18n.translate('expressions.functions.mathColumn.args.copyMetaFromHelpText', {
        defaultMessage:
          "If set, the meta object from the specified column id is copied over to the specified target column. If the column doesn't exist it silently fails.",
      }),
      required: false,
      default: null,
    },
  },
  fn: (input, args, context) => {
    const columns = [...input.columns];
    const existingColumnIndex = columns.findIndex(({ id }) => {
      return id === args.id;
    });
    if (existingColumnIndex > -1) {
      throw new Error('ID must be unique');
    }

    const newRows = input.rows.map((row) => {
      return {
        ...row,
        [args.id]: math.fn(
          {
            type: 'datatable',
            columns: input.columns,
            rows: [row],
          },
          {
            expression: args.expression,
            onError: args.onError,
          },
          context
        ),
      };
    });
    const type = newRows.length ? getType(newRows[0][args.id]) : 'null';
    const newColumn: DatatableColumn = {
      id: args.id,
      name: args.name ?? args.id,
      meta: { type, params: { id: type } },
    };
    if (args.copyMetaFrom) {
      const metaSourceFrom = columns.find(({ id }) => id === args.copyMetaFrom);
      newColumn.meta = { ...newColumn.meta, ...(metaSourceFrom?.meta || {}) };
    }

    columns.push(newColumn);

    return {
      type: 'datatable',
      columns,
      rows: newRows,
    } as Datatable;
  },
};
