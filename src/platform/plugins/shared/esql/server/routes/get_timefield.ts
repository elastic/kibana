/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import { getIndexPatternFromESQLQuery, getTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import { Parser, isSubQuery } from '@kbn/esql-language';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';

/**
 * Registers the ESQL get timefield route.
 * This route returns the timefield to use for the ES|QL ad-hoc dataview.
 *
 * The timefield is extracted from the ES|QL query if specified.
 * If not specified, it checks if the index pattern contains the default time field '@timestamp'.
 * In case of subqueries, it verifies that all involved indices contain the '@timestamp' field.
 * @param router The IRouter instance to register the route with.
 * @param logger The logger instance from the PluginInitializerContext.
 *
 * @returns timeField or undefined
 */
export const registerGetTimeFieldRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: `${TIMEFIELD_ROUTE}{query}`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        params: schema.object({
          query: schema.string(),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const { query } = request.params;

      // Query is of the form "from index | where timefield >= ?_tstart".
      // At this point we just want to extract the timefield if present in the query
      const timeField = getTimeFieldFromESQLQuery(query);
      if (timeField) {
        return response.ok({
          body: { timeField },
        });
      }
      const core = await requestHandlerContext.core;
      const client = core.elasticsearch.client.asCurrentUser;

      // Trying to identify if there is @timestamp
      const { root } = Parser.parse(query);
      const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
      if (!sourceCommand) {
        return response.ok({
          body: { timeField: undefined },
        });
      }
      const sources = getIndexPatternFromESQLQuery(query);
      const subqueryArgs = sourceCommand.args.filter(isSubQuery);
      const hasSubqueries = subqueryArgs.length > 0;

      try {
        // in case of subqueries we need to check all indices separately
        const indices = hasSubqueries ? sources.split(',') : [sources];
        const fieldCapsPromises = indices.map((index) =>
          client.fieldCaps({
            index,
            fields: '@timestamp',
            include_unmapped: false,
          })
        );

        const fieldCapsResults: FieldCapsResponse[] = await Promise.all(fieldCapsPromises);

        // Check if all responses have the @timestamp field
        const allHaveTimestamp = fieldCapsResults.every(
          (result) => result.fields && result.fields['@timestamp']
        );

        return response.ok({
          body: { timeField: allHaveTimestamp ? '@timestamp' : undefined },
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );
};
