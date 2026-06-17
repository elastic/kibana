/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { createSHA256Hash } from '@kbn/crypto';
import { stableStringify } from '@kbn/std';
import { z } from '@kbn/zod/v4';
import type { ServerStepRegistry } from '../step_registry';
import type { ServerStepDefinition } from '../step_registry/types';

const ROUTE_PATH = '/internal/workflows_extensions/step_definitions';

/**
 * Converts a zod schema to a stable JSON Schema representation for hashing.
 * Falls back to a deterministic marker so an unconvertible schema still
 * contributes to (and changes) the hash when it changes.
 */
function schemaToJson(schema?: z.ZodType): unknown {
  if (!schema) {
    return undefined;
  }
  return z.toJSONSchema(schema);
}

/**
 * Computes a hash over the entire step definition so changes to the schemas
 * (inputSchema/outputSchema/configSchema), handler/onCancel implementations, or
 * metadata are all detected. `id` is excluded since it's the lookup key.
 */
function computeDefinitionHash(definition: ServerStepDefinition, logger: Logger): string {
  const {
    label,
    description,
    category,
    stability,
    deprecation,
    documentation,
    inputSchema,
    outputSchema,
    configSchema,
    handler,
    onCancel,
  } = definition;

  try {
    const canonical = {
      label,
      description,
      category,
      stability,
      deprecation,
      documentation,
      inputSchema: schemaToJson(inputSchema),
      outputSchema: schemaToJson(outputSchema),
      configSchema: schemaToJson(configSchema),
      handler: handler?.toString(),
      onCancel: onCancel?.toString(),
    };
    return createSHA256Hash(stableStringify(canonical));
  } catch (error) {
    logger.error(`Failed to compute definition hash for step ${definition.id}`, { error });
    return 'definition-hashing-error';
  }
}

/**
 * Registers the route to get all registered step definitions.
 * This endpoint is used by Scout tests to validate that new step registrations
 * are approved by the workflows-eng team.
 */
export function registerGetStepDefinitionsRoute(
  router: IRouter,
  registry: ServerStepRegistry,
  logger: Logger
): void {
  router.get(
    {
      path: ROUTE_PATH,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is used for testing purposes only. No sensitive data is exposed.',
        },
      },
      validate: false,
    },
    async (_context, _request, response) => {
      const allStepDefinitions = registry.getAll();
      const steps = allStepDefinitions
        // create a hash of the full definition to detect changes in schemas or implementation
        .map((definition) => ({
          id: definition.id,
          definitionHash: computeDefinitionHash(definition, logger),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      return response.ok({ body: { steps } });
    }
  );
}
