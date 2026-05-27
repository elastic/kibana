/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  BY_REF_SCHEMA_META,
  BY_VALUE_SCHEMA_META,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { linksArraySchema, layoutSchema } from './content_management/schema/v1/cm_services';

// Links by-value state schema (contains layout and links)
const linksByValueStateSchema = schema.object({
  layout: layoutSchema,
  links: linksArraySchema,
});

// Links by-reference state schema (contains ref_id)
const linksByReferenceStateSchema = schema.object({
  ref_id: schema.string({
    meta: {
      title: 'Reference ID',
      description: 'The unique identifier of the Links library item',
    },
  }),
});

// Complete links embeddable schema (union of by-value and by-reference embeddables)
export const linksEmbeddableSchema = schema.oneOf(
  [
    // Links by-value embeddable schema (by-value state + titles)
    schema.allOf([linksByValueStateSchema, serializedTitlesSchema], {
      meta: BY_VALUE_SCHEMA_META,
    }),
    // Links by-reference embeddable schema (by-reference state + titles)
    schema.allOf([linksByReferenceStateSchema, serializedTitlesSchema], {
      meta: BY_REF_SCHEMA_META,
    }),
  ],
  {
    meta: {
      description: 'Links embeddable schema',
    },
  }
);

export type LinksByValueState = TypeOf<typeof linksByValueStateSchema>;
export type LinksByReferenceState = TypeOf<typeof linksByReferenceStateSchema>;
export type LinksEmbeddableState = TypeOf<typeof linksEmbeddableSchema>;
