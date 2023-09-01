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
import { RequestAdapter } from '@kbn/inspector-plugin/common';

import { zipObject } from 'lodash';
import { Observable, defer, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '../../es_query';
import { getTime } from '../../query';
import { ESQL_SEARCH_STRATEGY, IKibanaSearchRequest, ISearchGeneric, KibanaContext } from '..';
import { IKibanaSearchResponse } from '../types';
import { UiSettingsCommon } from '../..';

type Input = KibanaContext | null;
type Output = Observable<Datatable>;

interface Arguments {
  query: string;
  timezone?: string;
  timeField?: string;
  locale?: string;
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

interface ESQLSearchParams {
  time_zone?: string;
  query: string;
  filter?: unknown;
  locale?: string;
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
      defaultMessage: 'Queries Elasticsearch using ES|QL.',
    }),
    args: {
      query: {
        aliases: ['_', 'q'],
        types: ['string'],
        help: i18n.translate('data.search.esql.query.help', {
          defaultMessage: 'An ES|QL query.',
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
      timeField: {
        aliases: ['timeField'],
        types: ['string'],
        help: i18n.translate('data.search.essql.timeField.help', {
          defaultMessage: 'The time field to use in the time range filter set in the context.',
        }),
      },
      locale: {
        aliases: ['locale'],
        types: ['string'],
        help: i18n.translate('data.search.essql.locale.help', {
          defaultMessage: 'The locale to use.',
        }),
      },
    },
    fn(
      input,
      { query, timezone, timeField, locale },
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
        switchMap(({ search, uiSettings }) => {
          const params: ESQLSearchParams = {
            query,
            time_zone: timezone,
            locale,
          };
          if (input) {
            const esQueryConfigs = getEsQueryConfig(
              uiSettings as Parameters<typeof getEsQueryConfig>[0]
            );
            const timeFilter =
              input.timeRange &&
              getTime(undefined, input.timeRange, {
                fieldName: timeField,
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
                  error.message = `Couldn't parse Elasticsearch ES|QL query. You may need to add backticks to names containing special characters. Check your query and try again. Error: ${reason}`;
                } else {
                  error.message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
                }
              }

              return throwError(() => error);
            }),
            tap({
              next({ rawResponse }) {
                logInspectorRequest()
                  .stats({
                    hits: {
                      label: i18n.translate('data.search.es_search.hitsLabel', {
                        defaultMessage: 'Hits',
                      }),
                      value: `${rawResponse.values.length}`,
                      description: i18n.translate('data.search.es_search.hitsDescription', {
                        defaultMessage: 'The number of documents returned by the query.',
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
        map(({ rawResponse: body, warning }) => {
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
            warning,
          } as Datatable;
        })
      );
    },
  };

  return essql;
};
