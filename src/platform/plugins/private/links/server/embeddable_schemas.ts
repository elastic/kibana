/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  BY_REF_SCHEMA_META,
  BY_VALUE_SCHEMA_META,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { linksArraySchema, layoutSchema } from './content_management/schema/v1/cm_services';

// Links by-value state schema (contains layout and links)
const linksByValueStateSchema = z
  .object({
    layout: layoutSchema,
    links: linksArraySchema,
  })
  .strict();

// Links by-reference state schema (contains ref_id)
const linksByReferenceStateSchema = z
  .object({
    ref_id: z.string().meta({
      title: 'Reference ID',
      description: 'The unique identifier of the Links library item',
    }),
  })
  .strict();

// Complete links embeddable schema (union of by-value and by-reference embeddables)
export const linksEmbeddableSchema = z
  .union([
    z
      .object({
        ...linksByValueStateSchema.shape,
        ...serializedTitlesSchema.shape,
      })
      .strict()
      .meta(BY_VALUE_SCHEMA_META),
    z
      .object({
        ...linksByReferenceStateSchema.shape,
        ...serializedTitlesSchema.shape,
      })
      .strict()
      .meta(BY_REF_SCHEMA_META),
  ])
  .meta({
    description: 'Links embeddable schema',
  });

export type LinksByValueState = z.output<typeof linksByValueStateSchema>;
export type LinksByReferenceState = z.output<typeof linksByReferenceStateSchema>;
export type LinksEmbeddableState = z.output<typeof linksEmbeddableSchema>;
