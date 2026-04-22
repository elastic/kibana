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
import type { StepDocMetadata } from '../../common';
import type { ServerStepRegistry } from '../step_registry';

const ROUTE_PATH = '/internal/workflows_extensions/step_doc_metadata';

const bodySchema = schema.object({
  steps: schema.arrayOf(
    schema.object({
      id: schema.string(),
      label: schema.string(),
      description: schema.string(),
      documentation: schema.maybe(
        schema.object({
          details: schema.maybe(schema.string()),
          examples: schema.maybe(schema.arrayOf(schema.string())),
        })
      ),
    })
  ),
});

/**
 * Registers the POST route for the public plugin to push step doc metadata.
 */
export function registerPostStepDocMetadataRoute(
  router: IRouter,
  registry: ServerStepRegistry,
  docMetadataStore: Map<string, StepDocMetadata>
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
        const raw = request.body as { steps: StepDocMetadata[] };
        const steps = raw.steps.map((entry) => ({
          id: entry.id,
          label: entry.label,
          description: entry.description,
          ...(entry.documentation && { documentation: entry.documentation }),
        }));

        for (const doc of steps) {
          if (!registry.has(doc.id)) {
            return response.badRequest({
              body: {
                message: `Step "${doc.id}" is not registered. Doc metadata can only be set for registered steps.`,
              },
            });
          }
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
