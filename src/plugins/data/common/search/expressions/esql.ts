/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

import { zipObject } from 'lodash';
import { Observable, defer, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs';
import { buildEsQuery } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLSearchReponse, ESQLSearchParams } from '@kbn/es-types';
import { ESQL_LATEST_VERSION } from '@kbn/esql-utils';
import { getEsQueryConfig } from '../../es_query';
import { getTime } from '../../query';
import { ESQL_ASYNC_SEARCH_STRATEGY, KibanaContext } from '..';
import { UiSettingsCommon } from '../..';

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
    },
    fn(
      input,
      { query, /* timezone, */ timeField, locale, titleForInspector, descriptionForInspector },
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
            version: ESQL_LATEST_VERSION,
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
            IKibanaSearchResponse<ESQLSearchReponse>
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
              next({ rawResponse, requestParams }) {
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
                  .ok({ json: rawResponse, requestParams });
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
          const allColumns =
            (body.all_columns ?? body.columns)?.map(({ name, type }) => ({
              id: name,
              name,
              meta: { type: esFieldTypeToKibanaFieldType(type), esType: type },
              isNull: hasEmptyColumns ? !lookup.has(name) : false,
            })) ?? [];

          // sort only in case of empty columns to correctly align columns to items in values array
          if (hasEmptyColumns) {
            allColumns.sort((a, b) => Number(a.isNull) - Number(b.isNull));
          }
          const columnNames = allColumns?.map(({ name }) => name);

          const rows = body.values.map((row) => zipObject(columnNames, row));

          return {
            type: 'datatable',
            meta: {
              type: 'es_ql',
            },
            columns: allColumns,
            rows,
            warning,
          } as Datatable;
        })
      );
    },
  };

  return essql;
};
