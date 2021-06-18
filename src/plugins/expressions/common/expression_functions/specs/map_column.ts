/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, defer, of, zip } from 'rxjs';
import { map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { Datatable, DatatableColumn, getType } from '../../expression_types';

export interface MapColumnArguments {
  id?: string | null;
  name: string;
  expression(datatable: Datatable): Observable<boolean | number | string | null>;
  copyMetaFrom?: string | null;
}

export const mapColumn: ExpressionFunctionDefinition<
  'mapColumn',
  Datatable,
  MapColumnArguments,
  Observable<Datatable>
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
  fn(input, args) {
    const existingColumnIndex = input.columns.findIndex(({ id, name }) =>
      args.id ? id === args.id : name === args.name
    );
    const id = input.columns[existingColumnIndex]?.id ?? args.id ?? args.name;

    return defer(() => {
      const rows$ = input.rows.length
        ? zip(
            ...input.rows.map((row) =>
              args
                .expression({
                  type: 'datatable',
                  columns: [...input.columns],
                  rows: [row],
                })
                .pipe(map((value) => ({ ...row, [id]: value })))
            )
          )
        : of([]);

      return rows$.pipe<Datatable>(
        map((rows) => {
          const type = getType(rows[0]?.[id]);
          const newColumn: DatatableColumn = {
            id,
            name: args.name,
            meta: { type, params: { id: type } },
          };
          if (args.copyMetaFrom) {
            const metaSourceFrom = input.columns.find(
              ({ id: columnId }) => columnId === args.copyMetaFrom
            );
            newColumn.meta = { ...newColumn.meta, ...(metaSourceFrom?.meta ?? {}) };
          }

          const columns = [...input.columns];
          if (existingColumnIndex === -1) {
            columns.push(newColumn);
          } else {
            columns[existingColumnIndex] = newColumn;
          }

          return {
            columns,
            rows,
            type: 'datatable',
          };
        })
      );
    });
  },
};
