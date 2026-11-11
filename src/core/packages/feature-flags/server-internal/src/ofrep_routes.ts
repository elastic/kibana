/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import {
  entityTag,
  ifNoneMatchSatisfied,
  OFREP_BULK_PATH,
  OFREP_SINGLE_PATH,
  toBulkResponse,
  toOfrepEvaluations,
  type OfrepErrorBody,
  type OfrepEvaluation,
} from './ofrep_evaluation';

const OFREP_BODY_MAX_BYTES = 65_536;

/**
 * Accepts the OFREP request body and ignores it.
 * Evaluation uses the server snapshot, including config overrides. The posted context is not applied.
 */
export const ofrepRequestBodySchema = schema.nullable(
  schema.object(
    {
      context: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'ignore' }
  )
);

const routeSecurity = {
  authz: {
    enabled: false,
    reason:
      'Feature flag evaluations are deployment-scoped and are already delivered to every authenticated UI session. This internal endpoint exposes those same values so the browser does not need its own vendor credential.',
  },
  authc: {
    enabled: true,
  },
} as const;

/** Registers the internal OFREP routes served to the Kibana browser. */
export function registerOfrepRoutes(
  router: IRouter,
  getFlags: () => Promise<Record<string, unknown>>,
  logger: Logger
): void {
  router.post(
    {
      path: OFREP_BULK_PATH,
      validate: {
        body: ofrepRequestBodySchema,
      },
      security: routeSecurity,
      options: {
        access: 'internal',
        body: { maxBytes: OFREP_BODY_MAX_BYTES },
      },
    },
    async (_context, request, response) => {
      const flags = await readFlags(getFlags, logger);
      if (!flags) {
        return evaluationFailure(response);
      }

      const body = toBulkResponse(flags);
      return cachedResponse(request, response, body);
    }
  );

  router.post(
    {
      path: OFREP_SINGLE_PATH,
      validate: {
        params: schema.object({
          flagKey: schema.string({ minLength: 1, maxLength: 255 }),
        }),
        body: ofrepRequestBodySchema,
      },
      security: routeSecurity,
      options: {
        access: 'internal',
        body: { maxBytes: OFREP_BODY_MAX_BYTES },
      },
    },
    async (_context, request, response) => {
      const { flagKey } = request.params as { flagKey: string };
      const flags = await readFlags(getFlags, logger);
      if (!flags) {
        return evaluationFailure(response);
      }

      const evaluation = toOfrepEvaluations(flags).find((flag) => flag.key === flagKey);
      if (!evaluation) {
        const body: OfrepErrorBody = {
          key: flagKey,
          errorCode: 'FLAG_NOT_FOUND',
          errorDetails: `Flag '${flagKey}' was not found.`,
        };
        return response.custom({
          statusCode: 404,
          body,
          bypassErrorFormat: true,
        });
      }

      return cachedResponse(request, response, evaluation);
    }
  );
}

async function readFlags(
  getFlags: () => Promise<Record<string, unknown>>,
  logger: Logger
): Promise<Record<string, unknown> | undefined> {
  try {
    return await getFlags();
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error('Feature flag evaluation failed for OFREP')
    );
    return undefined;
  }
}

function evaluationFailure(response: KibanaResponseFactory) {
  const body: OfrepErrorBody = {
    errorCode: 'GENERAL',
    errorDetails: 'Feature flag evaluation failed.',
  };
  return response.custom({
    statusCode: 500,
    body,
    bypassErrorFormat: true,
  });
}

function cachedResponse(
  request: KibanaRequest,
  response: KibanaResponseFactory,
  body: { flags: OfrepEvaluation[]; metadata: Record<string, never> } | OfrepEvaluation
) {
  const etag = entityTag(body);
  const headers = request.headers as Record<string, string | string[] | undefined>;
  const ifNoneMatch = headers['if-none-match'] ?? headers['If-None-Match'];
  if (ifNoneMatchSatisfied(ifNoneMatch, etag)) {
    return response.notModified({ headers: { etag } });
  }

  return response.ok({ body, headers: { etag } });
}
