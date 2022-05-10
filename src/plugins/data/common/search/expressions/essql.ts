/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { KibanaRequest } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  ExpressionFunctionDefinition,
  ExpressionValueFilter,
} from '@kbn/expressions-plugin/common';
import type {
  EssqlSearchStrategyRequest,
  EssqlSearchStrategyResponse,
} from '@kbn/canvas-plugin/types';

import { lastValueFrom } from 'rxjs';
import { ISearchGeneric } from '..';

const name = 'essql';

type Input = ExpressionValueFilter;
type Output = any;

interface Arguments {
  query: string;
  parameter: Array<string | number | boolean>;
  count: number;
  timezone: string;
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
  search: ISearchGeneric;
}

export const getEssqlFn = ({ getStartDependencies }: EssqlFnArguments) => {
  const essql: EssqlExpressionFunctionDefinition = {
    name,
    type: 'datatable',
    inputTypes: ['filter'],
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
    },
    async fn(input, args, { getKibanaRequest }) {
      const { search } = await getStartDependencies(() => {
        const request = getKibanaRequest?.();
        if (!request) {
          throw new Error(
            'A KibanaRequest is required to run queries on the server. ' +
              'Please provide a request object to the expression execution params.'
          );
        }

        return request;
      });

      const { parameter, ...restOfArgs } = args;
      const req = {
        ...restOfArgs,
        params: parameter,
        filter: input.and,
      };

      return lastValueFrom(
        search<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse>(req, {
          strategy: 'essql',
        })
      )
        .then(({ columns, rows }: EssqlSearchStrategyResponse) => {
          return {
            type: 'datatable',
            meta: {
              type: 'essql',
            },
            columns,
            rows,
          };
        })
        .catch((e) => {
          let message = `Unexpected error from Elasticsearch: ${e.message}`;
          if (e.err) {
            const { type, reason } = e.err.attributes;
            if (type === 'parsing_exception') {
              message = `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`;
            } else {
              message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
            }
          }

          // Re-write the error message before surfacing it up
          e.message = message;
          throw e;
        });
    },
  };

  return essql;
};
