/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { EXPLAIN_ERROR_ROUTE } from '@kbn/esql-types';
import type { DeploymentInfo } from '../deployment_info';
import { describeDeployment } from '../deployment_info';
import type { EsqlServerPluginStart } from '../types';
import { createScopedModel, resolveConnectorId } from './helpers';

const ExplainErrorSchema = lazySchema(() =>
  z
    .object({
      cause: z
        .enum(['query', 'resources', 'data', 'permissions', 'unclear'])
        .describe(
          'query: the query is wrong or can be written differently to avoid the error. resources: the cluster ran out of memory, time or another limit. data: the data or mapping does not match what the query expects. permissions: a privilege or license is missing. unclear: the message does not say enough.'
        ),
      summary: z
        .string()
        .describe(
          'One or two plain sentences saying what went wrong, in words a person who does not know Elasticsearch internals understands. Say whether the problem is in the query or in the deployment.'
        ),
      suggestions: z
        .array(z.string())
        .max(4)
        .describe(
          'At most four short actions, most useful first. Each one is a single sentence in the imperative. Empty when the summary already says what to do.'
        ),
      query: z
        .string()
        .describe(
          'The complete corrected ES|QL query, only when a change to the query resolves the error and the error message gives you what you need to write it. Empty otherwise.'
        ),
    })
    .describe('An explanation of an ES|QL error and what to do about it.')
);

const SYSTEM_PROMPT = `You help people who run ES|QL queries in Kibana Discover and get an error from Elasticsearch.

You are given the query and the error message, and when it is known, where Elasticsearch runs. Explain the error and say what to do.

Where Elasticsearch runs decides what the user can do, so make the advice fit it.
- Elastic Cloud Serverless: the user cannot choose node sizes or change cluster settings, because the project scales on its own. Do not tell them to resize anything or to change a setting. A request can still be larger than what a single request is allowed, so say that the query has to ask for less, and that Elastic support can help when a reasonable query keeps failing.
- Elastic Cloud Hosted (ECH): more memory means a larger deployment size, which the user changes in the Elastic Cloud console. Name the Elastic Cloud console, and say to increase the size of the nodes that run the data.
- Elastic Cloud Enterprise (ECE): more memory means a larger deployment size, which the user changes in the Cloud UI of their ECE installation.
- Self-managed: the user runs the nodes, so more memory means a machine with more memory and a larger JVM heap on the nodes that run the data.
- Not known: say what is needed in general and do not assume how the user can get it.

Decide first where the problem is.
- A parse or verification error, such as an unknown column, a wrong type, a bad function call or a missing quote, is a problem in the query. Say what is wrong and, when the error message gives you what you need, return the corrected query.
- A circuit breaker, out of memory, too many buckets, or a similar limit means the query asked for more memory than the node has. It is not a mistake in the query. Say so in the summary. Read the numbers in the message: the limit shows how much memory the node can give a request, and a limit of a few gigabytes means a small node. The first suggestion is always this one: give the nodes more memory in the way that fits where Elasticsearch runs, which is the lasting fix, since a change to the query only keeps this one query under the limit that exists today. On serverless, where the user cannot add memory, the first suggestion is the change to the query that asks for the least, and you say that support can help. The suggestions after it are the changes to the query that could help, such as a narrower time range, a filter earlier in the query, a lower cardinality grouping key, fewer grouping keys or columns, or a LIMIT. Never suggest raising the circuit breaker limit, because that can crash the node.
- A timeout means the query ran too long: suggest narrowing the data it reads.
- A missing index, field or privilege, or a license error, is a data or permissions problem. Say what to check, or who to ask. Do not invent field or index names.

Rules:
- Use only what the query and the error message tell you. You are not given the mappings, so never invent a field or index name. Return a corrected query only when the message names the fix, for example "did you mean" or an exact type to cast to.
- A corrected query keeps the intent of the original, keeps named parameters such as ?_tstart and ?_tend exactly as written, and does not add, remove or change LIMIT or SORT unless the fix needs it.
- Be brief. No preamble and no restating of the error message. Do not list things that may or may not apply.`;

const buildMessages = (
  queryString: string,
  errorMessage: string,
  deployment?: DeploymentInfo
): BaseMessageLike[] => [
  ['system', SYSTEM_PROMPT],
  [
    'user',
    [
      '<query>',
      queryString,
      '</query>',
      '',
      '<error>',
      errorMessage,
      '</error>',
      '',
      ...(deployment
        ? ['<environment>', describeDeployment(deployment), '</environment>', '']
        : []),
      'Explain the error and say what to do.',
    ].join('\n'),
  ],
];

const normalize = (query: string): string => query.replace(/\s+/g, ' ').trim();

export interface ExplainErrorRouteOptions {
  /** Where Elasticsearch runs, so the advice fits what the user can do about it. */
  deployment?: DeploymentInfo;
  /** Like the other AI features of ES|QL, this one needs an active enterprise license. */
  hasEnterpriseLicense: () => Promise<boolean>;
}

export const registerExplainErrorRoute = (
  router: IRouter,
  getStartServices: CoreSetup<EsqlServerPluginStart>['getStartServices'],
  context: PluginInitializerContext,
  { deployment, hasEnterpriseLicense }: ExplainErrorRouteOptions
) => {
  // A cheap check, with no model call, so the UI can hide the action when it cannot be used: there
  // is no enterprise license, or no AI connector.
  router.get(
    {
      path: EXPLAIN_ERROR_ROUTE,
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
        if (!(await hasEnterpriseLicense())) {
          return response.ok({ body: { available: false } });
        }
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
      path: EXPLAIN_ERROR_ROUTE,
      validate: {
        body: schema.object({
          queryString: schema.string({ maxLength: 50000 }),
          errorMessage: schema.string({ maxLength: 8000 }),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped inference client',
        },
      },
    },
    async (_requestHandlerContext, request, response) => {
      const logger = context.logger.get();
      try {
        const { queryString, errorMessage } = request.body;
        if (!(await hasEnterpriseLicense())) {
          return response.forbidden({
            body: { message: 'Explaining an error with AI needs an enterprise license.' },
          });
        }
        const [, { inference, searchInferenceEndpoints }] = await getStartServices();

        const connectorId = await resolveConnectorId({
          inference,
          request,
          searchInferenceEndpoints,
        });

        if (!connectorId) {
          return response.badRequest({ body: { message: 'No AI connector available.' } });
        }

        const model = await createScopedModel({
          inference,
          request,
          connectorId,
          chatModelOptions: { temperature: 0 },
        });
        const result = await model.chatModel
          .withStructuredOutput(ExplainErrorSchema, { name: 'explain_esql_error' })
          // The UI aborts its request when the error changes, so the model stops with it.
          .invoke(buildMessages(queryString, errorMessage, deployment), {
            signal: getRequestAbortedSignal(request.events.aborted$),
          });

        const fixedQuery = result.query.trim();
        const isUsable = fixedQuery.length > 0 && normalize(fixedQuery) !== normalize(queryString);

        return response.ok({
          body: {
            cause: result.cause,
            summary: result.summary.trim(),
            suggestions: result.suggestions.map((suggestion) => suggestion.trim()).filter(Boolean),
            query: isUsable ? fixedQuery : null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`ES|QL error explanation failed: ${message}`);
        if (
          error instanceof Error &&
          'reason' in error &&
          typeof (error as { reason: string }).reason === 'string' &&
          (error as { reason: string }).reason.startsWith('license_')
        ) {
          return response.forbidden({ body: { message } });
        }
        return response.customError({ statusCode: 500, body: { message } });
      }
    }
  );
};
