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

export const markdownEditorSchema = schema.object({
  content: schema.string(),
});

export const markdownEmbeddableSchema = schema.allOf(
  [markdownEditorSchema, serializedTitlesSchema],
  {
    meta: {
      description: 'Markdown embeddable schema',
    },
  }
);

export type MarkdownEditorState = TypeOf<typeof markdownEditorSchema>;
export type MarkdownEmbeddableState = TypeOf<typeof markdownEmbeddableSchema>;
