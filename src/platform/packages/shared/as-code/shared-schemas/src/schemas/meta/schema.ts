/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const asCodeMetaSchema = z
  .object({
    created_at: z
      .string()
      .meta({ description: 'Timestamp when the object was created (ISO 8601).' })
      .optional(),
    created_by: z
      .string()
      .meta({ description: 'User profile ID of the user who created the object.' })
      .optional(),
    managed: z
      .boolean()
      .meta({
        description: 'When `true`, the object is managed by Kibana and cannot be edited by users.',
      })
      .optional(),
    owner: z
      .string()
      .meta({ description: 'Identifier of the plugin or team that owns this object.' })
      .optional(),
    updated_at: z
      .string()
      .meta({ description: 'Timestamp when the object was last updated (ISO 8601).' })
      .optional(),
    updated_by: z
      .string()
      .meta({ description: 'User profile ID of the user who last updated the object.' })
      .optional(),
    version: z
      .string()
      .meta({ description: 'Internal version identifier for optimistic concurrency control.' })
      .optional(),
  })
  .meta({
    id: 'kbn-as-code-meta',
  });

export type AsCodeMeta = z.output<typeof asCodeMetaSchema>;
