/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { Datatable, DatatableColumn, getType } from '../../expression_types';

export interface MapColumnArguments {
  id?: string | null;
  name: string;
  expression?(datatable: Datatable): Observable<boolean | number | string | null>;
  copyMetaFrom?: string | null;
}

export const mapColumn: ExpressionFunctionDefinition<
  'mapColumn',
  Datatable,
  MapColumnArguments,
  Promise<Datatable>
> = {
  name: 'mapColumn',
  aliases: ['mc'], // midnight commander. So many times I've launched midnight commander instead of moving a file.
  type: 'datatable',
  inputTypes: ['datatable'],
  help: i18n.translate('expressions.functions.mapColumnHelpText', {
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
    id: {
      types: ['string', 'null'],
      help: i18n.translate('expressions.functions.mapColumn.args.idHelpText', {
        defaultMessage:
          'An optional id of the resulting column. When no id is provided, the id will be looked up from the existing column by the provided name argument. If no column with this name exists yet, a new column with this name and an identical id will be added to the table.',
      }),
      required: false,
      default: null,
    },
    name: {
      types: ['string'],
      aliases: ['_', 'column'],
      help: i18n.translate('expressions.functions.mapColumn.args.nameHelpText', {
        defaultMessage: 'The name of the resulting column. Names are not required to be unique.',
      }),
      required: true,
    },
    expression: {
      types: ['boolean', 'number', 'string', 'null'],
      resolve: false,
      aliases: ['exp', 'fn', 'function'],
      help: i18n.translate('expressions.functions.mapColumn.args.expressionHelpText', {
        defaultMessage:
          'An expression that is executed on every row, provided with a single-row {DATATABLE} context and returning the cell value.',
        values: {
          DATATABLE: '`datatable`',
        },
      }),
      required: true,
    },
    copyMetaFrom: {
      types: ['string', 'null'],
      help: i18n.translate('expressions.functions.mapColumn.args.copyMetaFromHelpText', {
        defaultMessage:
          "If set, the meta object from the specified column id is copied over to the specified target column. If the column doesn't exist it silently fails.",
      }),
      required: false,
      default: null,
    },
  },
  fn: (input, args) => {
    const expression = (...params: Parameters<Required<MapColumnArguments>['expression']>) =>
      args
        .expression?.(...params)
        .pipe(take(1))
        .toPromise() ?? Promise.resolve(null);

    const columns = [...input.columns];
    const existingColumnIndex = columns.findIndex(({ id, name }) => {
      if (args.id) {
        return id === args.id;
      }
      return name === args.name;
    });
    const columnId =
      existingColumnIndex === -1 ? args.id ?? args.name : columns[existingColumnIndex].id;

    const rowPromises = input.rows.map((row) => {
      return expression({
        type: 'datatable',
        columns,
        rows: [row],
      }).then((val) => ({
        ...row,
        [columnId]: val,
      }));
    });

    return Promise.all(rowPromises).then((rows) => {
      const type = rows.length ? getType(rows[0][columnId]) : 'null';
      const newColumn: DatatableColumn = {
        id: columnId,
        name: args.name,
        meta: { type, params: { id: type } },
      };
      if (args.copyMetaFrom) {
        const metaSourceFrom = columns.find(({ id }) => id === args.copyMetaFrom);
        newColumn.meta = { ...newColumn.meta, ...(metaSourceFrom?.meta || {}) };
      }

      if (existingColumnIndex === -1) {
        columns.push(newColumn);
      } else {
        columns[existingColumnIndex] = newColumn;
      }

      return {
        type: 'datatable',
        columns,
        rows,
      } as Datatable;
    });
  },
};
