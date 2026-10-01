/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ISearchMethods } from '@kbn/search-types';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { Filter } from '@kbn/es-query';
import { getSideEffectFunction, type KibanaContext } from '..';

declare global {
  interface Window {
    /**
     * Debug setting to make requests complete slower than normal. Only available on snapshots where `error_query` is enabled in ES.
     */
    ELASTIC_ESQL_DELAY_SECONDS?: number;
  }
}

type Input = KibanaContext | null;
type Output = Promise<Datatable>;

interface Arguments {
  query: string;
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
  searchService: ISearchMethods;
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
    allowCache: {
      withSideEffects: (_, { inspectorAdapters }) => {
        return getSideEffectFunction(inspectorAdapters);
      },
    },
    async fn(
      input,
      { query, timeField, locale, titleForInspector, descriptionForInspector, ignoreGlobalFilters },
      { abortSignal, inspectorAdapters, getKibanaRequest, getSearchSessionId, getExecutionContext }
    ) {
      const { searchService } = await getStartDependencies(() => {
        const request = getKibanaRequest?.();
        if (!request) {
          throw new Error(
            'A KibanaRequest is required to run queries on the server. ' +
              'Please provide a request object to the expression execution params.'
          );
        }

        return request;
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

      const { datatable } = await searchService.esql(
        {
          query,
          locale,
          kibanaQueryContext: {
            timeRange: input?.timeRange,
            timeField,
            kibanaFilters: [
              ...(ignoreGlobalFilters ? [] : input?.filters ?? []),
              ...(delayFilter ? [delayFilter] : []),
            ],
            kqlQuery: ignoreGlobalFilters ? undefined : input?.query,
            esqlVariables: input?.esqlVariables,
          },
          approximation: input?.isApproximate,
          dropNullColumns: true,
          includeExecutionMetadata: true,
          columnMetadata: true,
        },
        {
          abortSignal,
          sessionId: getSearchSessionId(),
          executionContext: getExecutionContext(),
          projectRouting: input?.projectRouting,
          inspector: {
            adapter: inspectorAdapters.requests ?? new RequestAdapter(),
            title:
              titleForInspector ??
              i18n.translate('data.search.dataRequest.title', {
                defaultMessage: 'Data',
              }),
            description:
              descriptionForInspector ??
              i18n.translate('data.search.es_search.dataRequest.description', {
                defaultMessage:
                  'This request queries Elasticsearch to fetch the data for the visualization.',
              }),
          },
        }
      );

      return datatable!;
    },
  };

  return essql;
};
