/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, savedObjectId, savedObjectType } from '@kbn/zod';

const exportedObjectSchema = z.object({
  type: savedObjectType().meta({ description: 'The saved object type.' }),
  id: savedObjectId().meta({ description: 'The saved object ID.' }),
  data: z.record(z.string(), z.unknown()).meta({
    description: "The body the type's public API accepts on PUT.",
  }),
});

export const exportReferencedObjectsResponseSchema = z.object({
  objects: z.array(exportedObjectSchema).meta({
    description: 'The exported objects, with referenced objects before the objects that use them.',
  }),
  problems: z
    .array(
      z.object({
        type: z.string(),
        id: z.string(),
        reason: z.enum([
          'not_found',
          'unsupported_type',
          'invalid_body',
          'transform_failed',
          'dropped_content',
        ]),
        message: z.string(),
        roots: z.array(z.string()).meta({
          description: 'The IDs of the root objects that led to the problem.',
        }),
      })
    )
    .meta({ description: 'What the export found but could not include, and why.' }),
});

const decisionSchema = z.object({
  type: savedObjectType().meta({ description: 'The type of the conflicting object.' }),
  id: savedObjectId().meta({ description: 'The ID of the conflicting object in `objects`.' }),
  destination_id: savedObjectId().optional().meta({
    description:
      'The `destination_id` the conflict was reported with, when it differs from `id`. Defaults to `id`.',
  }),
  action: z.enum(['overwrite', 'skip']).meta({
    description: '`overwrite` replaces the existing object, and `skip` leaves it unchanged.',
  }),
});

/** Builds the import request body schema, capped at core's `savedObjects.maxImportExportSize`. */
export const getImportReferencedObjectsRequestSchema = (maxImportExportSize: number) =>
  z
    .object({
      objects: z.array(exportedObjectSchema).min(1).max(maxImportExportSize).meta({
        description: 'The `objects` of an export.',
      }),
      mode: z.enum(['request_action', 'overwrite', 'new_copies']).default('request_action').meta({
        description:
          'How objects are written: `request_action` writes objects that do not exist yet and reports the conflicts, `overwrite` overwrites existing objects, and `new_copies` gives every object a new ID, except objects of types that opt into reuse, such as data views and tags, that already exist in this space under the same ID.',
      }),
      decisions: z.array(decisionSchema).min(1).max(maxImportExportSize).optional().meta({
        description:
          'Resolves the conflicts that a `request_action` import reported, with the same `objects`. Only the named objects are written or skipped, and the results list only them.',
      }),
    })
    .superRefine(({ objects, mode, decisions }, ctx) => {
      if (!decisions) return;
      if (mode !== 'request_action') {
        ctx.addIssue({
          code: 'custom',
          path: ['decisions'],
          message: '`decisions` is allowed only with the `request_action` mode.',
        });
      }
      const objectKeys = new Set(objects.map(({ type, id }) => `${type}:${id}`));
      decisions.forEach(({ type, id }, index) => {
        if (!objectKeys.has(`${type}:${id}`)) {
          ctx.addIssue({
            code: 'custom',
            path: ['decisions', index],
            message: `[${type}:${id}] isn't in \`objects\`.`,
          });
        }
      });
    });

export const importReferencedObjectsResponseSchema = z.object({
  success: z.boolean().meta({
    description: 'False when any object is a conflict or an error.',
  }),
  results: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      destination_id: z.string().meta({
        description: 'The ID the object has in the destination.',
      }),
      status: z.enum(['created', 'overwritten', 'reused', 'conflict', 'skipped', 'error']).meta({
        description:
          '`reused` means an object that already exists in this space under the same ID was used instead of a new copy, and `skipped` means a conflict that a decision left unchanged.',
      }),
      error: z.object({ type: z.string(), message: z.string() }).optional(),
    })
  ),
  warnings: z.array(
    z.object({
      type: z.literal('missing_reference'),
      from: z.object({ type: z.string(), id: z.string() }),
      reference: z.object({ type: z.string(), id: z.string() }),
    })
  ),
});

export type ExportReferencedObjectsResponse = z.infer<typeof exportReferencedObjectsResponseSchema>;
export type ImportReferencedObjectsRequest = z.infer<
  ReturnType<typeof getImportReferencedObjectsRequestSchema>
>;
export type ImportReferencedObjectsResponse = z.infer<typeof importReferencedObjectsResponseSchema>;
