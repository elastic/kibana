/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { buildEsQuery } from '@kbn/es-query';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

import { zipObject } from 'lodash';
import type { ISearchMethods } from '@kbn/search-types';
import type { SqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { NowProviderPublicContract } from '../../../public';
import { getEsQueryConfig } from '../../es_query';
import { getTime } from '../../query';
import type { UiSettingsCommon } from '../..';
import type { KibanaContext, SqlRequestParams } from '..';

type Input = KibanaContext | null;
type Output = Promise<Datatable>;

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
  searchService: ISearchMethods;
  uiSettings: UiSettingsCommon;
}

function sanitize(value: string) {
  return value.replace(/[\(\)]/g, '_');
}

function mapResponseToDatatable(body: SqlQueryResponse): Datatable {
  const columns =
    body.columns?.map(({ name, type }) => ({
      id: sanitize(name),
      name: sanitize(name),
      meta: { type: esFieldTypeToKibanaFieldType(type) },
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
}

export const getEssqlFn = ({ getStartDependencies }: EssqlFnArguments) => {
  const essql: EssqlExpressionFunctionDefinition = {
    name: 'essql',
    type: 'datatable',
    inputTypes: ['kibana_context', 'null'],
    allowCache: true,
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
    async fn(
      input,
      { count, parameter, query, timeField, timezone },
      { abortSignal, inspectorAdapters, getKibanaRequest }
    ) {
      const { nowProvider, searchService, uiSettings } = await getStartDependencies(() => {
        const request = getKibanaRequest?.();
        if (!request) {
          throw new Error(
            'A KibanaRequest is required to run queries on the server. ' +
              'Please provide a request object to the expression execution params.'
          );
        }

        return request;
      });

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

      try {
        const { rawResponse, took, requestParams } = await searchService.sql(
          {
            query,
            params: parameter,
            fetchSize: count,
            filter: params.filter,
          },
          {
            abortSignal,
            timeZone: timezone,
          }
        );

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
          .ok({ json: rawResponse, requestParams });

        return mapResponseToDatatable(rawResponse);
      } catch (error) {
        logInspectorRequest().error({
          json: 'attributes' in error ? error.attributes : { message: error.message },
        });

        if (!error.attributes) {
          error.message = `Unexpected error from Elasticsearch: ${error.message}`;
        } else {
          const { type, reason } = error.attributes;
          if (type === 'parsing_exception') {
            error.message = `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`;
          } else {
            error.message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
          }
        }

        throw error;
      }
    },
  };

  return essql;
};
