/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { createSHA256Hash } from '@kbn/crypto';
import { stableStringify } from '@kbn/std';
import { z } from '@kbn/zod/v4';
import type { TriggerRegistry } from '../trigger_registry';

const ROUTE_PATH = '/internal/workflows_extensions/trigger_definitions';

function eventSchemaToJsonSchema(eventSchema: z.ZodType): Record<string, unknown> | null {
  try {
    return z.toJSONSchema(eventSchema) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hashJsonSchema(schema: Record<string, unknown>): string {
  return createSHA256Hash(stableStringify(schema));
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
