/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { z, lazySchema } from '@kbn/zod/v4';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { OPTIMIZE_QUERY_ROUTE } from '@kbn/esql-types';
import type { EsqlServerPluginStart } from '../types';
import { createScopedModel, resolveConnectorId } from './helpers';

const OptimizeQuerySchema = lazySchema(() =>
  z
    .object({
      analysis: z
        .string()
        .describe(
          'Short working notes, not shown to the user. For each STATS, its grouping keys and functions, and which of the safe rewrites apply to the query.'
        ),
      canImprove: z
        .boolean()
        .describe(
          'true only when there is a rewrite that returns exactly the same results and that the profile suggests will run faster.'
        ),
      query: z
        .string()
        .describe('The complete rewritten ES|QL query. Empty when canImprove is false.'),
      reason: z
        .string()
        .describe(
          'When canImprove is true: one or two plain sentences naming what changed and why it is faster. When canImprove is false: one short sentence of at most 20 words.'
        ),
    })
    .describe('A faster, equivalent ES|QL query, or the reason none was found.')
);

const SYSTEM_PROMPT = `You review the performance of ES|QL queries using a profile from Elasticsearch.

You are given a query and a summary of how it ran: the time spent in each operator, how many rows each operator received and emitted, how long drivers waited, and the physical plan.

Rewrite the query so it runs faster while returning exactly the same results: the same columns with the same names in the same order, and the same rows.

Work in two steps.
1. Read the query on its own, without the profile. A query can combine several subqueries, written as FROM (FROM ...), (FROM ...). Treat every subquery as a query of its own: list its commands, and for every STATS in it write down its grouping keys and functions. Then check each safe rewrite below against each subquery separately. Do this in the analysis field.
2. Then use the profile only to judge whether a rewrite that applies is worth it. The profile never makes a rewrite unsafe.

Judge equivalence only by what the query computes, never by what it might have been meant to compute. A rewrite is safe when you can show the result is mathematically identical. If you cannot, set canImprove to false.

Rewrites that are safe when their conditions hold:
- Collapse two aggregations. When a STATS groups by a set of keys and a following STATS groups by a subset of those keys, the pair can be one STATS grouped by the subset only if the outer function combines the inner results exactly: SUM of COUNT(*) is COUNT(*), SUM of SUM is SUM, MIN of MIN is MIN, MAX of MAX is MAX. AVG of AVG, COUNT of a grouped column and COUNT_DISTINCT are not safe. A grouping key that exists only to be summed away is dropped, and its field is then no longer read at all, which removes both the grouping and the cost of reading that field.
- Move a WHERE that only uses grouping keys from after a STATS to before it, and move a WHERE before an EVAL that it does not depend on.
- Remove columns, EVALs and sorts whose results are never used, unless they change the output.
- Compute a repeated expression once instead of several times.

Rules:
- A rewrite inside one subquery is enough to answer yes. Keep the subqueries: the same number of them, in the same order, each in its own parentheses, separated by commas, with the same outer commands after them. Never merge subqueries or move their commands outside the parentheses.
- Never introduce COUNT_DISTINCT, or any other approximate function, because its results can differ from the exact ones.
- Do not rewrite parts that are cheap.
- Keep named parameters such as ?_tstart, ?_tend and any ?variable exactly as written.
- Do not add, remove or change LIMIT, and do not change the sort order of the output.
- Use only valid ES|QL.
- An operator that reads fields being dominant is not a reason to decline: a rewrite that no longer needs a field also stops reading it.
- Say that no improvement exists only when no rewrite above applies, or when the time is mostly planning or waiting that a rewrite cannot change.
- Keep the reason short. When there is no improvement, give one sentence of at most 20 words with the single main reason. Do not restate the query or list what you checked.`;

const buildMessages = (
  queryString: string,
  profileContext: string,
  focusCommand?: string
): BaseMessageLike[] => [
  ['system', SYSTEM_PROMPT],
  [
    'user',
    [
      '<query>',
      queryString,
      '</query>',
      '',
      '<profile>',
      profileContext,
      '</profile>',
      '',
      ...(focusCommand
        ? [
            '<focus>',
            focusCommand,
            '</focus>',
            'The user asked to speed up this command in particular. Look for a rewrite that makes it cheaper, and only change other parts when that is needed. If you cannot improve it safely, say so.',
            '',
          ]
        : []),
      'Return a faster equivalent query, or say that no safe improvement exists.',
    ].join('\n'),
  ],
];

const normalize = (query: string): string => query.replace(/\s+/g, ' ').trim();

export const registerOptimizeQueryRoute = (
  router: IRouter,
  getStartServices: CoreSetup<EsqlServerPluginStart>['getStartServices'],
  context: PluginInitializerContext
) => {
  // A cheap check, with no model call, so the UI can hide the action when no AI connector exists.
  router.get(
    {
      path: OPTIMIZE_QUERY_ROUTE,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'This route only reports whether an AI connector is available',
        },
      },
    },
    async (_requestHandlerContext, request, response) => {
      try {
        const [, { inference, searchInferenceEndpoints }] = await getStartServices();
        const connectorId = await resolveConnectorId({
          inference,
          request,
          searchInferenceEndpoints,
        });
        return response.ok({ body: { available: Boolean(connectorId) } });
      } catch (error) {
        return response.ok({ body: { available: false } });
      }
    }
  );

  router.post(
    {
      path: OPTIMIZE_QUERY_ROUTE,
      validate: {
        body: schema.object({
          queryString: schema.string({ maxLength: 50000 }),
          profileContext: schema.string({ maxLength: 60000 }),
          focusCommand: schema.maybe(schema.string({ maxLength: 5000 })),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    async (requestHandlerContext, request, response) => {
      const logger = context.logger.get();
      try {
        const { queryString, profileContext, focusCommand } = request.body;
        const [, { inference, searchInferenceEndpoints }] = await getStartServices();

        const connectorId = await resolveConnectorId({
          inference,
          request,
          searchInferenceEndpoints,
        });

        if (!connectorId) {
          return response.badRequest({
            body: {
              message: 'No AI connector available.',
            },
          });
        }

        const model = await createScopedModel({
          inference,
          request,
          connectorId,
          chatModelOptions: { temperature: 0 },
        });
        const result = await model.chatModel
          .withStructuredOutput(OptimizeQuerySchema, { name: 'suggest_faster_query' })
          .invoke(buildMessages(queryString, profileContext, focusCommand));

        const suggestion = result.query.trim();
        const isUsable =
          result.canImprove &&
          suggestion.length > 0 &&
          normalize(suggestion) !== normalize(queryString);

        return response.ok({
          body: { query: isUsable ? suggestion : null, reason: result.reason.trim() },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`ES|QL query optimization failed: ${errorMessage}`);
        if (
          error instanceof Error &&
          'reason' in error &&
          typeof (error as { reason: string }).reason === 'string' &&
          (error as { reason: string }).reason.startsWith('license_')
        ) {
          return response.forbidden({
            body: { message: errorMessage },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: errorMessage },
        });
      }
    }
  );
};
