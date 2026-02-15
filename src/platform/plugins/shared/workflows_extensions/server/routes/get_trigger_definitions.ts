/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stringify from 'json-stable-stringify';
import { createHash } from 'node:crypto';
import type { IRouter } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import type { TriggerRegistry } from '../trigger_registry';

const ROUTE_PATH = '/internal/workflows_extensions/trigger_definitions';

/**
 * Converts a trigger's Zod eventSchema to JSON Schema for hashing.
 * eventSchema is not serialized in the response; only the hash is returned for schema change detection.
 */
function eventSchemaToJsonSchema(eventSchema: z.ZodType): Record<string, unknown> | null {
  try {
    return z.toJSONSchema(eventSchema) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Returns a deterministic hash of the JSON Schema so clients can detect when the event schema has changed
 * (e.g. after a plugin update). Compare stored hash with the one in the next response to invalidate caches or re-validate.
 */
function hashJsonSchema(schema: Record<string, unknown>): string {
  return createHash('sha256').update(stringify(schema), 'utf8').digest('hex');
}

/**
 * Registers the route to get all registered trigger definitions.
 * This endpoint is used by Scout tests to validate that new trigger registrations
 * are approved by the workflows-eng team.
 */
export function registerGetTriggerDefinitionsRoute(
  router: IRouter,
  registry: TriggerRegistry
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
      const triggers = registry
        .list()
        .map((t) => {
          const jsonSchema = eventSchemaToJsonSchema(t.eventSchema);
          const schemaHash = jsonSchema !== null ? hashJsonSchema(jsonSchema) : '';
          return { id: t.id, schemaHash };
        })
        .sort((a, b) => a.id.localeCompare(b.id));

      return response.ok({ body: { triggers } });
    }
  );
}
