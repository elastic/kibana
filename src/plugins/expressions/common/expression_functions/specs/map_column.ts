/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, combineLatest, defer } from 'rxjs';
import { defaultIfEmpty, map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { Datatable, DatatableColumnType, getType } from '../../expression_types';

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
    const metaColumn = args.copyMetaFrom
      ? input.columns.find(({ id }) => id === args.copyMetaFrom)
      : undefined;
    const existingColumnIndex = input.columns.findIndex(({ id, name }) =>
      args.id ? id === args.id : name === args.name
    );
    const columnIndex = existingColumnIndex === -1 ? input.columns.length : existingColumnIndex;
    const id = input.columns[columnIndex]?.id ?? args.id ?? args.name;

    return defer(() =>
      combineLatest(
        input.rows.map((row) =>
          args
            .expression({
              ...input,
              columns: [...input.columns],
              rows: [row],
            })
            .pipe(
              map((value) => ({ ...row, [id]: value })),
              defaultIfEmpty(row)
            )
        )
      )
    ).pipe(
      defaultIfEmpty([] as Datatable['rows']),
      map((rows) => {
        let type: DatatableColumnType = 'null';
        for (const row of rows) {
          const rowType = getType(row[id]) as DatatableColumnType;
          if (rowType !== 'null') {
            type = rowType;
            break;
          }
        }

        const columns = [...input.columns];
        columns[columnIndex] = {
          id,
          name: args.name,
          meta: {
            type,
            params: { id: type },
            ...(metaColumn?.meta ?? {}),
          },
        };

        return {
          ...input,
          columns,
          rows,
        };
      })
    );
  },
};
