/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, ValidationError } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory } from '@kbn/core-http-server';
import { ReservedPrivilegesSet } from '@kbn/core-http-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import {
  FEATURE_FLAGS_OVERRIDES_API_PATH,
  MAX_FLAG_KEY_LENGTH,
  MAX_STRING_OVERRIDE_LENGTH,
  type FeatureFlagOverrideValue,
  updateStoredOverrides,
} from './overrides_saved_object';

export interface TrackedFeatureFlagEvaluation {
  key: string;
  value: FeatureFlagOverrideValue;
}

export interface FeatureFlagsOverridesResponse {
  runtimeOverrides: Record<string, FeatureFlagOverrideValue>;
  configOverrides: Record<string, unknown>;
  /** Flags this node has evaluated. Keeps the helper usable when the provider snapshot is empty. */
  evaluatedFlags: TrackedFeatureFlagEvaluation[];
}

export interface FeatureFlagsOverridesRouteDeps {
  getRepository: () => ISavedObjectsRepository | undefined;
  getOverridesResponse: () => FeatureFlagsOverridesResponse;
  /**
   * Applies overrides on this node immediately and bumps the write counter so an
   * in-flight poll cannot overwrite the write with a stale read.
   */
  commitRuntimeOverrides: (overrides: Record<string, FeatureFlagOverrideValue>) => void;
  logger: Logger;
}

const routeSecurity = {
  authz: {
    requiredPrivileges: [ReservedPrivilegesSet.superuser],
  },
};

const flagKeySchema = schema.string({ minLength: 1, maxLength: MAX_FLAG_KEY_LENGTH });

export const overrideValueBodySchema = schema.object({
  value: schema.oneOf([
    schema.boolean(),
    schema.number(),
    schema.string({ maxLength: MAX_STRING_OVERRIDE_LENGTH }),
  ]),
});

const flagKeyParamsSchema = schema.object({
  flagKey: flagKeySchema,
});

/** Registers the superuser routes that read and change runtime flag overrides. */
export function registerOverrideRoutes(
  router: IRouter,
  {
    getRepository,
    getOverridesResponse,
    commitRuntimeOverrides,
    logger,
  }: FeatureFlagsOverridesRouteDeps
): void {
  router.get(
    {
      path: FEATURE_FLAGS_OVERRIDES_API_PATH,
      validate: false,
      security: routeSecurity,
      options: { access: 'internal' },
    },
    (_context, _request, response) => {
      return response.ok({ body: getOverridesResponse() });
    }
  );

  router.put(
    {
      path: `${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`,
      validate: {
        params: flagKeyParamsSchema,
        body: overrideValueBodySchema,
      },
      security: routeSecurity,
      options: { access: 'internal' },
    },
    async (_context, request, response) => {
      const repository = getRepository();
      if (!repository) {
        return serviceNotStarted(response);
      }

      const { flagKey } = request.params;
      const { value } = request.body;
      try {
        const overrides = await updateStoredOverrides(repository, (current) => ({
          ...current,
          [flagKey]: value,
        }));
        logger.warn(`Feature flag overrides: persisted "${flagKey}" = ${JSON.stringify(value)}`);
        commitRuntimeOverrides(overrides);
        return response.ok({ body: { ok: true as const } });
      } catch (error) {
        return persistFailure(response, logger, error);
      }
    }
  );

  router.delete(
    {
      path: `${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`,
      validate: {
        params: flagKeyParamsSchema,
      },
      security: routeSecurity,
      options: { access: 'internal' },
    },
    async (_context, request, response) => {
      const repository = getRepository();
      if (!repository) {
        return serviceNotStarted(response);
      }

      const { flagKey } = request.params;
      try {
        const overrides = await updateStoredOverrides(repository, (current) => {
          const next = { ...current };
          delete next[flagKey];
          return next;
        });
        logger.warn(`Feature flag overrides: removed "${flagKey}"`);
        commitRuntimeOverrides(overrides);
        return response.ok({ body: { ok: true as const } });
      } catch (error) {
        return persistFailure(response, logger, error);
      }
    }
  );

  router.delete(
    {
      path: FEATURE_FLAGS_OVERRIDES_API_PATH,
      validate: false,
      security: routeSecurity,
      options: { access: 'internal' },
    },
    async (_context, _request, response) => {
      const repository = getRepository();
      if (!repository) {
        return serviceNotStarted(response);
      }

      try {
        const overrides = await updateStoredOverrides(repository, () => ({}));
        logger.warn('Feature flag overrides: cleared all runtime overrides');
        commitRuntimeOverrides(overrides);
        return response.ok({ body: { ok: true as const } });
      } catch (error) {
        return persistFailure(response, logger, error);
      }
    }
  );
}

function serviceNotStarted(response: KibanaResponseFactory) {
  return response.customError({
    statusCode: 503,
    body: { message: 'Feature flag overrides are not available until Kibana has started.' },
  });
}

function persistFailure(response: KibanaResponseFactory, logger: Logger, error: unknown) {
  if (error instanceof ValidationError) {
    return response.badRequest({ body: error });
  }

  logger.error(
    error instanceof Error ? error : new Error('Failed to store feature flag overrides')
  );
  throw error;
}
