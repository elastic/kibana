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
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { linksArraySchema, layoutSchema } from './content_management/schema/v1/cm_services';

// Links by-value state schema (contains layout and links)
const linksByValueStateSchema = schema.object({
  layout: layoutSchema,
  links: linksArraySchema,
});

// Links by-reference state schema (contains savedObjectId)
const linksByReferenceStateSchema = schema.object({
  savedObjectId: schema.string({
    meta: { description: 'The ID of the saved links object' },
  }),
});

// Links by-value embeddable schema (by-value state + titles)
const linksByValueEmbeddableSchema = schema.allOf(
  [linksByValueStateSchema, serializedTitlesSchema],
  {
    meta: {
      description: 'Links by-value embeddable schema',
    },
  }
);

// Links by-reference embeddable schema (by-reference state + titles)
const linksByReferenceEmbeddableSchema = schema.allOf(
  [linksByReferenceStateSchema, serializedTitlesSchema],
  {
    meta: {
      description: 'Links by-reference embeddable schema',
    },
  }
);

// Complete links embeddable schema (union of by-value and by-reference embeddables)
export const linksEmbeddableSchema = schema.oneOf(
  [linksByValueEmbeddableSchema, linksByReferenceEmbeddableSchema],
  {
    meta: {
      description: 'Links embeddable schema',
    },
  }
);

export type LinksByValueState = TypeOf<typeof linksByValueStateSchema>;
export type LinksByReferenceState = TypeOf<typeof linksByReferenceStateSchema>;
export type LinksEmbeddableState = TypeOf<typeof linksEmbeddableSchema>;
