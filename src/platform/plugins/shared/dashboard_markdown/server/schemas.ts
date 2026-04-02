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
import { BY_REF_SCHEMA_META, BY_VALUE_SCHEMA_META } from '@kbn/presentation-publishing-schemas';

// Markdown by-value state schema (contains content)
const markdownByValueStateSchema = schema.object({
  content: schema.string({
    defaultValue: '',
  }),
});

// Markdown by-reference state schema (contains savedObjectId)
const markdownByReferenceStateSchema = schema.object({
  ref_id: schema.string({
    meta: { description: 'The unique identifier of the markdown library item.' },
  }),
});

// Markdown by-value embeddable schema (by-value state + titles)
export const markdownByValueEmbeddableSchema = schema.allOf(
  [markdownByValueStateSchema, serializedTitlesSchema],
  {
    meta: BY_VALUE_SCHEMA_META,
  }
);

// Markdown by-reference embeddable schema (by-reference state + titles)
const markdownByReferenceEmbeddableSchema = schema.allOf(
  [markdownByReferenceStateSchema, serializedTitlesSchema],
  {
    meta: BY_REF_SCHEMA_META,
  }
);

// Complete markdown embeddable schema (union of by-value and by-reference embeddables)
export const markdownEmbeddableSchema = schema.oneOf(
  [markdownByValueEmbeddableSchema, markdownByReferenceEmbeddableSchema],
  {
    defaultValue: { content: '' },
    meta: {
      description: 'Markdown panel config',
    },
  }
);

export type MarkdownByValueState = TypeOf<typeof markdownByValueStateSchema>;
export type MarkdownByReferenceState = TypeOf<typeof markdownByReferenceStateSchema>;
export type MarkdownEmbeddableState = TypeOf<typeof markdownEmbeddableSchema>;
