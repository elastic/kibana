/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { BY_REF_SCHEMA_META, BY_VALUE_SCHEMA_META } from '@kbn/presentation-publishing-schemas';

export const markdownByValueStateSchema = z
  .object({
    content: z.string(),
    settings: z
      .object({
        open_links_in_new_tab: z.boolean().default(true),
      })
      .strict(),
  })
  .strict();

const markdownByReferenceStateSchema = z
  .object({
    ref_id: z.string().meta({
      description: 'The unique identifier of the markdown library item.',
    }),
  })
  .strict();

export const markdownByValueEmbeddableSchema = markdownByValueStateSchema
  .extend(serializedTitlesSchema.shape)
  .strict()
  .meta(BY_VALUE_SCHEMA_META);

const markdownByReferenceEmbeddableSchema = markdownByReferenceStateSchema
  .extend(serializedTitlesSchema.shape)
  .strict()
  .meta(BY_REF_SCHEMA_META);

export const markdownEmbeddableSchema = z
  .union([markdownByValueEmbeddableSchema, markdownByReferenceEmbeddableSchema])
  .meta({
    description: 'Markdown panel config',
  });

export type MarkdownByValueState = z.output<typeof markdownByValueStateSchema>;
export type MarkdownByReferenceState = z.output<typeof markdownByReferenceStateSchema>;
export type MarkdownEmbeddableState = z.output<typeof markdownEmbeddableSchema>;

export type MarkdownSettingsState = MarkdownByValueState['settings'];
