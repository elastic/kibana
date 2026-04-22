/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { TriggerDocMetadata } from '../../common/trigger_registry/types';
import type { TriggerRegistry } from '../trigger_registry';

const ROUTE_PATH = '/internal/workflows_extensions/trigger_doc_metadata';

const bodySchema = schema.object({
  triggers: schema.arrayOf(
    schema.object({
      id: schema.string(),
      title: schema.string(),
      description: schema.string(),
      documentation: schema.maybe(
        schema.object({
          details: schema.maybe(schema.string()),
          examples: schema.maybe(schema.arrayOf(schema.string())),
        })
      ),
      snippets: schema.maybe(schema.object({ condition: schema.maybe(schema.string()) })),
    })
  ),
});

function toTriggerDocMetadata(entry: TriggerDocMetadata): TriggerDocMetadata {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    ...(entry.documentation && { documentation: entry.documentation }),
    ...(entry.snippets && { snippets: entry.snippets }),
  };
}

/**
 * Registers the POST route for the public plugin to push trigger doc metadata.
 * Doc metadata is stored in memory and merged into the GET trigger_definitions response.
 */
export function registerPostTriggerDocMetadataRoute(
  router: IRouter,
  registry: TriggerRegistry,
  docMetadataStore: Map<string, TriggerDocMetadata>
): void {
  router.post(
    {
      path: ROUTE_PATH,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is used by the public plugin to sync doc metadata for documentation. No sensitive data is exposed.',
        },
      },
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      try {
        const raw = request.body as { triggers: TriggerDocMetadata[] };
        const triggers = raw.triggers.map(toTriggerDocMetadata);

        for (const doc of triggers) {
          if (!registry.has(doc.id)) {
            return response.badRequest({
              body: {
                message: `Trigger "${doc.id}" is not registered. Doc metadata can only be set for registered triggers.`,
              },
            });
          }
        }
        for (const doc of triggers) {
          docMetadataStore.set(doc.id, doc);
        }

        return response.ok({ body: { ok: true } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return response.badRequest({ body: { message } });
      }
    }
  );
}
