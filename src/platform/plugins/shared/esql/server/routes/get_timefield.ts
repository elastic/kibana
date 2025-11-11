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
import { Parser, isSubQuery } from '@kbn/esql-ast';
// import { Parser } from '@kbn/esql-ast';

// import { type ResolveIndexResponse, REGISTRY_EXTENSIONS_ROUTE } from '@kbn/esql-types';

/**
 * Registers the ESQL extensions route.
 * This route handles requests for ESQL extensions based on the provided solutionId and query.
 *
 * @param router The IRouter instance to register the route with.
 * @param extensionsRegistry The ESQLExtensionsRegistry instance to use for fetching recommended queries.
 * @param logger The logger instance from the PluginInitializerContext.
 */
export const registerGetTimeFieldRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: `/internal/esql/get_timefield/{query}`,
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
      const core = await requestHandlerContext.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const { query } = request.params;
      // Query is of the form "from index | where timefield >= ?_tstart".
      // At this point we just want to extract the timefield if present in the query
      const timeField = getTimeFieldFromESQLQuery(query);
      if (timeField) {
        return response.ok({
          body: timeField,
        });
      }

      // Trying to identify if there is @timestamp

      const { root } = Parser.parse(query);
      const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
      if (!sourceCommand) {
        return response.ok({
          body: undefined,
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
          body: allHaveTimestamp ? '@timestamp' : undefined,
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );
};
