/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { Datatable, DatatableColumn } from '../../expression_types';

export interface CreateTableArguments {
  ids?: string[];
  names?: string[] | null;
  rowCount?: number;
}

export const createTable: ExpressionFunctionDefinition<
  'createTable',
  null,
  CreateTableArguments,
  Datatable
> = {
  name: 'createTable',
  type: 'datatable',
  inputTypes: ['null'],
  help: i18n.translate('expressions.functions.createTableHelpText', {
    defaultMessage:
      'Creates a datatable with a list of columns, and 1 or more empty rows. ' +
      'To populate the rows, use {mapColumnFn} or {mathColumnFn}.',
    values: {
      mathColumnFn: '`mathColumn`',
      mapColumnFn: '`mapColumn`',
    },
  }),
  args: {
    ids: {
      types: ['string'],
      help: i18n.translate('expressions.functions.createTable.args.idsHelpText', {
        defaultMessage:
          'Column ids to generate in positional order. ID represents the key in the row.',
      }),
      required: false,
      multi: true,
    },
    names: {
      types: ['string'],
      help: i18n.translate('expressions.functions.createTable.args.nameHelpText', {
        defaultMessage:
          'Column names to generate in positional order. Names are not required to be unique, and default to the ID if not provided.',
      }),
      required: false,
      multi: true,
    },
    rowCount: {
      types: ['number'],
      help: i18n.translate('expressions.functions.createTable.args.rowCountText', {
        defaultMessage:
          'The number of empty rows to add to the table, to be assigned a value later',
      }),
      default: 1,
      required: false,
    },
  },
  fn(input, args) {
    const columns: DatatableColumn[] = [];

    (args.ids ?? []).map((id, index) => {
      columns.push({
        id,
        name: args.names?.[index] ?? id,
        meta: { type: 'null' },
      });
    });

    return {
      columns,
      // Each row gets a unique object
      rows: [...Array(args.rowCount)].map(() => ({})),
      type: 'datatable',
    };
  },
};
