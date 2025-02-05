/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchGeneric,
} from '@kbn/search-types';
import type {
  Datatable,
  DatatableColumn,
  ExpressionFunctionDefinition,
} from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { getNamedParams, mapVariableToColumn } from '@kbn/esql-utils';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { zipObject } from 'lodash';
import { catchError, defer, map, Observable, switchMap, tap, throwError } from 'rxjs';
import { buildEsQuery, type Filter } from '@kbn/es-query';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import DateMath from '@kbn/datemath';
import { getEsQueryConfig } from '../../es_query';
import { getTime } from '../../query';
import {
  ESQL_ASYNC_SEARCH_STRATEGY,
  ESQL_TABLE_TYPE,
  isRunningResponse,
  type KibanaContext,
} from '..';
import { UiSettingsCommon } from '../..';

declare global {
  interface Window {
    /**
     * Debug setting to make requests complete slower than normal. Only available on snapshots where `error_query` is enabled in ES.
     */
    ELASTIC_ESQL_DELAY_SECONDS?: number;
  }
}

type Input = KibanaContext | null;
type Output = Observable<Datatable>;

interface Arguments {
  query: string;
  // TODO: time_zone support was temporarily removed from ES|QL,
  // we will need to add it back in once it is supported again.
  // https://github.com/elastic/elasticsearch/pull/102767
  // timezone?: string;
  timeField?: string;
  locale?: string;

  /**
   * Requests' meta for showing in Inspector
   */
  titleForInspector?: string;
  descriptionForInspector?: string;
  ignoreGlobalFilters?: boolean;
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

function extractTypeAndReason(attributes: any): { type?: string; reason?: string } {
  if (['type', 'reason'].every((prop) => prop in attributes)) {
    return attributes;
  }
  if ('error' in attributes) {
    return extractTypeAndReason(attributes.error);
  }
  return {};
}

export const getEsqlFn = ({ getStartDependencies }: EsqlFnArguments) => {
  const essql: EsqlExpressionFunctionDefinition = {
    name: 'esql',
    type: 'datatable',
    inputTypes: ['kibana_context', 'null'],
    allowCache: true,
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
      // timezone: {
      //   aliases: ['tz'],
      //   types: ['string'],
      //   default: 'UTC',
      //   help: i18n.translate('data.search.esql.timezone.help', {
      //     defaultMessage:
      //       'The timezone to use for date operations. Valid ISO8601 formats and UTC offsets both work.',
      //   }),
      // },
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
      titleForInspector: {
        aliases: ['titleForInspector'],
        types: ['string'],
        help: i18n.translate('data.search.esql.titleForInspector.help', {
          defaultMessage: 'The title to show in Inspector.',
        }),
      },
      descriptionForInspector: {
        aliases: ['descriptionForInspector'],
        types: ['string'],
        help: i18n.translate('data.search.esql.descriptionForInspector.help', {
          defaultMessage: 'The description to show in Inspector.',
        }),
      },
      ignoreGlobalFilters: {
        types: ['boolean'],
        default: false,
        help: i18n.translate('data.search.esql.ignoreGlobalFilters.help', {
          defaultMessage: 'Whether to ignore or use global query and filters',
        }),
      },
    },
    fn(
      input,
      {
        query,
        /* timezone, */ timeField,
        locale,
        titleForInspector,
        descriptionForInspector,
        ignoreGlobalFilters,
      },
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
            // time_zone: timezone,
            locale,
            include_ccs_metadata: true,
          };
          if (input) {
            const esQueryConfigs = getEsQueryConfig(
              uiSettings as Parameters<typeof getEsQueryConfig>[0]
            );

            const namedParams = getNamedParams(query, input.timeRange, input.esqlVariables);

            if (namedParams.length) {
              params.params = namedParams;
            }

            const timeFilter =
              input.timeRange &&
              getTime(undefined, input.timeRange, {
                fieldName: timeField,
              });

            // Used for debugging & inside automated tests to simulate a slow query
            const delayFilter: Filter | undefined = window.ELASTIC_ESQL_DELAY_SECONDS
              ? {
                  meta: {},
                  query: {
                    error_query: {
                      indices: [
                        {
                          name: '*',
                          error_type: 'warning',
                          stall_time_seconds: window.ELASTIC_ESQL_DELAY_SECONDS,
                        },
                      ],
                    },
                  },
                }
              : undefined;

            const filters = [
              ...(ignoreGlobalFilters ? [] : input.filters ?? []),
              ...(timeFilter ? [timeFilter] : []),
              ...(delayFilter ? [delayFilter] : []),
            ];

            params.filter = buildEsQuery(undefined, input.query || [], filters, esQueryConfigs);
          }

          let startTime = Date.now();
          const logInspectorRequest = () => {
            if (!inspectorAdapters.requests) {
              inspectorAdapters.requests = new RequestAdapter();
            }

            const request = inspectorAdapters.requests.start(
              titleForInspector ??
                i18n.translate('data.search.dataRequest.title', {
                  defaultMessage: 'Data',
                }),
              {
                description:
                  descriptionForInspector ??
                  i18n.translate('data.search.es_search.dataRequest.description', {
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
            IKibanaSearchResponse<ESQLSearchResponse>
          >(
            { params: { ...params, dropNullColumns: true } },
            { abortSignal, strategy: ESQL_ASYNC_SEARCH_STRATEGY }
          ).pipe(
            catchError((error) => {
              if (!error.attributes) {
                error.message = `Unexpected error from Elasticsearch: ${error.message}`;
              } else {
                const { type, reason } = extractTypeAndReason(error.attributes);
                if (type === 'parsing_exception') {
                  error.message = `Couldn't parse Elasticsearch ES|QL query. Check your query and try again. Error: ${reason}`;
                } else {
                  error.message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
                }
              }

              return throwError(() => error);
            }),
            tap({
              next(response) {
                if (isRunningResponse(response)) return;
                const { rawResponse, requestParams } = response;
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
                    ...(rawResponse?.took && {
                      queryTime: {
                        label: i18n.translate('data.search.es_search.queryTimeLabel', {
                          defaultMessage: 'Query time',
                        }),
                        value: i18n.translate('data.search.es_search.queryTimeValue', {
                          defaultMessage: '{queryTime}ms',
                          values: { queryTime: rawResponse.took },
                        }),
                        description: i18n.translate('data.search.es_search.queryTimeDescription', {
                          defaultMessage:
                            'The time it took to process the query. ' +
                            'Does not include the time to send the request or parse it in the browser.',
                        }),
                      },
                    }),
                  })
                  .json(params)
                  .ok({ json: { rawResponse }, requestParams });
              },
              error(error) {
                logInspectorRequest()
                  .json(params)
                  .error({
                    json: 'attributes' in error ? error.attributes : { message: error.message },
                  });
              },
            })
          );
        }),
        map(({ rawResponse: body, warning }) => {
          // all_columns in the response means that there is a separation between
          // columns with data and empty columns
          // columns contain only columns with data while all_columns everything
          const hasEmptyColumns =
            body.all_columns && body.all_columns?.length > body.columns.length;
          const lookup = new Set(
            hasEmptyColumns ? body.columns?.map(({ name }) => name) || [] : []
          );
          const indexPattern = getIndexPatternFromESQLQuery(query);

          const appliedTimeRange = input?.timeRange
            ? {
                from: DateMath.parse(input.timeRange.from),
                to: DateMath.parse(input.timeRange.to, { roundUp: true }),
              }
            : undefined;

          const allColumns =
            (body.all_columns ?? body.columns)?.map(({ name, type }) => ({
              id: name,
              name,
              meta: {
                type: esFieldTypeToKibanaFieldType(type),
                esType: type,
                sourceParams:
                  type === 'date'
                    ? {
                        appliedTimeRange,
                        params: {},
                        indexPattern,
                      }
                    : {
                        indexPattern,
                      },
              },
              isNull: hasEmptyColumns ? !lookup.has(name) : false,
            })) ?? [];

          const updatedWithVariablesColumns = mapVariableToColumn(
            query,
            input?.esqlVariables ?? [],
            allColumns as DatatableColumn[]
          );

          // sort only in case of empty columns to correctly align columns to items in values array
          if (hasEmptyColumns) {
            updatedWithVariablesColumns.sort((a, b) => Number(a.isNull) - Number(b.isNull));
          }
          const columnNames = updatedWithVariablesColumns?.map(({ name }) => name);

          const rows = body.values.map((row) => zipObject(columnNames, row));

          return {
            type: 'datatable',
            meta: {
              type: ESQL_TABLE_TYPE,
              query,
              statistics: {
                totalCount: body.values.length,
              },
            },
            columns: updatedWithVariablesColumns,
            rows,
            warning,
          } as Datatable;
        })
      );
    },
  };

  return essql;
};
