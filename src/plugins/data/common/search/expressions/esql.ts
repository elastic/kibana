/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { castEsToKbnFieldTypeName, ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import type {
  Datatable,
  DatatableColumnType,
  ExpressionFunctionDefinition,
} from '@kbn/expressions-plugin/common';

import { zipObject } from 'lodash';
import { Observable, defer, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ESQL_SEARCH_STRATEGY, IKibanaSearchRequest, ISearchGeneric, KibanaContext } from '..';
import { IKibanaSearchResponse } from '../types';

type Input = KibanaContext | null;
type Output = Observable<Datatable>;

interface Arguments {
  query: string;
  timezone?: string;
}

export type EsqlExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'esql',
  Input,
  Arguments,
  Output
>;

interface EsqlFnArguments {
  getStartDependencies(getKibanaRequest: () => KibanaRequest): Promise<EsqlStartDependencies>;
}

interface EsqlStartDependencies {
  search: ISearchGeneric;
}

function normalizeType(type: string): DatatableColumnType {
  switch (type) {
    case ES_FIELD_TYPES._INDEX:
    case ES_FIELD_TYPES.GEO_POINT:
    case ES_FIELD_TYPES.IP:
      return KBN_FIELD_TYPES.STRING;
    case '_version':
      return KBN_FIELD_TYPES.NUMBER;
    case 'datetime':
      return KBN_FIELD_TYPES.DATE;
    default:
      return castEsToKbnFieldTypeName(type) as DatatableColumnType;
  }
}

function sanitize(value: string) {
  return value.replace(/[\(\)]/g, '_');
}

interface ESQLSearchParams {
  time_zone?: string;
  query: string;
}

interface ESQLSearchReponse {
  columns?: Array<{
    name: string;
    type: string;
  }>;
  values: unknown[][];
}

export const getEsqlFn = ({ getStartDependencies }: EsqlFnArguments) => {
  const essql: EsqlExpressionFunctionDefinition = {
    name: 'esql',
    type: 'datatable',
    inputTypes: ['kibana_context', 'null'],
    help: i18n.translate('data.search.esql.help', {
      defaultMessage: 'Queries Elasticsearch using ESQL.',
    }),
    args: {
      query: {
        aliases: ['_', 'q'],
        types: ['string'],
        help: i18n.translate('data.search.esql.query.help', {
          defaultMessage: 'An ESQL query.',
        }),
      },
      timezone: {
        aliases: ['tz'],
        types: ['string'],
        default: 'UTC',
        help: i18n.translate('data.search.esql.timezone.help', {
          defaultMessage:
            'The timezone to use for date operations. Valid ISO8601 formats and UTC offsets both work.',
        }),
      },
    },
    fn(input, { query, timezone }, { abortSignal, inspectorAdapters, getKibanaRequest }) {
      return defer(() =>
        getStartDependencies(() => {
          const request = getKibanaRequest?.();
          if (!request) {
            throw new Error(
              'A KibanaRequest is required to run queries on the server. ' +
                'Please provide a request object to the expression execution params.'
            );
          }

          return request;
        })
      ).pipe(
        switchMap(({ search }) => {
          const params: ESQLSearchParams = {
            query,
            time_zone: timezone,
          };

          return search<
            IKibanaSearchRequest<ESQLSearchParams>,
            IKibanaSearchResponse<ESQLSearchReponse>
          >({ params }, { abortSignal, strategy: ESQL_SEARCH_STRATEGY }).pipe(
            catchError((error) => {
              if (!error.err) {
                error.message = `Unexpected error from Elasticsearch: ${error.message}`;
              } else {
                const { type, reason } = error.err.attributes;
                if (type === 'parsing_exception') {
                  error.message = `Couldn't parse Elasticsearch ESQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`;
                } else {
                  error.message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
                }
              }

              return throwError(() => error);
            })
          );
        }),
        map(({ rawResponse: body }) => {
          const columns =
            body.columns?.map(({ name, type }) => ({
              id: sanitize(name),
              name: sanitize(name),
              meta: { type: normalizeType(type) },
            })) ?? [];
          const columnNames = columns.map(({ name }) => name);
          const rows = body.values.map((row) => zipObject(columnNames, row));

          return {
            type: 'datatable',
            meta: {
              type: 'es_ql',
            },
            columns,
            rows,
          } as Datatable;
        })
      );
    },
  };

  return essql;
};
