/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { buildEsQuery } from '@kbn/es-query';
import { castEsToKbnFieldTypeName, ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import type {
  Datatable,
  DatatableColumnType,
  ExpressionFunctionDefinition,
} from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

import { zipObject } from 'lodash';
import { Observable, defer, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import type { NowProviderPublicContract } from '../../../public';
import { getEsQueryConfig } from '../../es_query';
import { getTime } from '../../query';
import { UiSettingsCommon } from '../..';
import {
  ISearchGeneric,
  KibanaContext,
  SqlRequestParams,
  SqlSearchStrategyRequest,
  SqlSearchStrategyResponse,
  SQL_SEARCH_STRATEGY,
} from '..';

type Input = KibanaContext | null;
type Output = Observable<Datatable>;

interface Arguments {
  query: string;
  parameter?: Array<string | number | boolean>;
  count?: number;
  timezone?: string;
  timeField?: string;
}

export type EssqlExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'essql',
  Input,
  Arguments,
  Output
>;

interface EssqlFnArguments {
  getStartDependencies(getKibanaRequest: () => KibanaRequest): Promise<EssqlStartDependencies>;
}

interface EssqlStartDependencies {
  nowProvider?: NowProviderPublicContract;
  search: ISearchGeneric;
  uiSettings: UiSettingsCommon;
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

export const getEssqlFn = ({ getStartDependencies }: EssqlFnArguments) => {
  const essql: EssqlExpressionFunctionDefinition = {
    name: 'essql',
    type: 'datatable',
    inputTypes: ['kibana_context', 'null'],
    help: i18n.translate('data.search.essql.help', {
      defaultMessage: 'Queries Elasticsearch using Elasticsearch SQL.',
    }),
    args: {
      query: {
        aliases: ['_', 'q'],
        types: ['string'],
        help: i18n.translate('data.search.essql.query.help', {
          defaultMessage: 'An Elasticsearch SQL query.',
        }),
      },
      parameter: {
        aliases: ['param'],
        types: ['string', 'number', 'boolean'],
        multi: true,
        help: i18n.translate('data.search.essql.parameter.help', {
          defaultMessage: 'A parameter to be passed to the SQL query.',
        }),
      },
      count: {
        types: ['number'],
        help: i18n.translate('data.search.essql.count.help', {
          defaultMessage:
            'The number of documents to retrieve. For better performance, use a smaller data set.',
        }),
        default: 1000,
      },
      timezone: {
        aliases: ['tz'],
        types: ['string'],
        default: 'UTC',
        help: i18n.translate('data.search.essql.timezone.help', {
          defaultMessage:
            'The timezone to use for date operations. Valid ISO8601 formats and UTC offsets both work.',
        }),
      },
      timeField: {
        aliases: ['timeField'],
        types: ['string'],
        help: i18n.translate('data.search.essql.timeField.help', {
          defaultMessage: 'The time field to use in the time range filter set in the context.',
        }),
      },
    },
    fn(
      input,
      { count, parameter, query, timeField, timezone },
      { abortSignal, inspectorAdapters, getKibanaRequest }
    ) {
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
        switchMap(({ nowProvider, search, uiSettings }) => {
          const params: SqlRequestParams = {
            query,
            fetch_size: count,
            time_zone: timezone,
            params: parameter,
            field_multi_value_leniency: true,
          };

          if (input) {
            const esQueryConfigs = getEsQueryConfig(
              uiSettings as Parameters<typeof getEsQueryConfig>[0]
            );
            const timeFilter =
              input.timeRange &&
              getTime(undefined, input.timeRange, {
                fieldName: timeField,
                forceNow: nowProvider?.get(),
              });

            params.filter = buildEsQuery(
              undefined,
              input.query || [],
              [...(input.filters ?? []), ...(timeFilter ? [timeFilter] : [])],
              esQueryConfigs
            );
          }

          let startTime = Date.now();
          const logInspectorRequest = () => {
            if (!inspectorAdapters.requests) {
              inspectorAdapters.requests = new RequestAdapter();
            }

            const request = inspectorAdapters.requests.start(
              i18n.translate('data.search.dataRequest.title', {
                defaultMessage: 'Data',
              }),
              {
                description: i18n.translate('data.search.es_search.dataRequest.description', {
                  defaultMessage:
                    'This request queries Elasticsearch to fetch the data for the visualization.',
                }),
              },
              startTime
            );
            startTime = Date.now();

            return request;
          };

          return search<SqlSearchStrategyRequest, SqlSearchStrategyResponse>(
            { params },
            { abortSignal, strategy: SQL_SEARCH_STRATEGY }
          ).pipe(
            catchError((error) => {
              if (!error.err) {
                error.message = `Unexpected error from Elasticsearch: ${error.message}`;
              } else {
                const { type, reason } = error.err.attributes;
                if (type === 'parsing_exception') {
                  error.message = `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`;
                } else {
                  error.message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
                }
              }

              return throwError(() => error);
            }),
            tap({
              next({ rawResponse, took }) {
                logInspectorRequest()
                  .stats({
                    hits: {
                      label: i18n.translate('data.search.es_search.hitsLabel', {
                        defaultMessage: 'Hits',
                      }),
                      value: `${rawResponse.rows.length}`,
                      description: i18n.translate('data.search.es_search.hitsDescription', {
                        defaultMessage: 'The number of documents returned by the query.',
                      }),
                    },
                    queryTime: {
                      label: i18n.translate('data.search.es_search.queryTimeLabel', {
                        defaultMessage: 'Query time',
                      }),
                      value: i18n.translate('data.search.es_search.queryTimeValue', {
                        defaultMessage: '{queryTime}ms',
                        values: { queryTime: took },
                      }),
                      description: i18n.translate('data.search.es_search.queryTimeDescription', {
                        defaultMessage:
                          'The time it took to process the query. ' +
                          'Does not include the time to send the request or parse it in the browser.',
                      }),
                    },
                  })
                  .json(params)
                  .ok({ json: rawResponse });
              },
              error(error) {
                logInspectorRequest().error({ json: error });
              },
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
          const rows = body.rows.map((row) => zipObject(columnNames, row));

          return {
            type: 'datatable',
            meta: {
              type: 'essql',
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
