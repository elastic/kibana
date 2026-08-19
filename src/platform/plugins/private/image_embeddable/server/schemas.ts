/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { DEFAULT_OBJECT_FIT, IMAGE_EMBEDDABLE_SUPPORTED_TRIGGERS } from '../common';

const imageFileSrcSchema = z
  .object({
    type: z.literal('file'),
    file_id: z.string(),
  })
  .strict()
  .meta({
    title: 'file',
  });

const imageUrlSrcSchema = z
  .object({
    type: z.literal('url'),
    url: z.string().meta({ description: 'URL of the image' }),
  })
  .strict()
  .meta({
    title: 'url',
  });

const imageConfigSchema = z
  .object({
    src: z.union([imageFileSrcSchema, imageUrlSrcSchema]).meta({ description: 'Image source' }),
    alt_text: z.string().optional(),
    object_fit: z
      .union([z.literal('fill'), z.literal('contain'), z.literal('cover'), z.literal('none')])
      .default(DEFAULT_OBJECT_FIT)
      .meta({ description: 'How the image should be sized within its container' }),

    background_color: z.string().optional(),
  })
  .strict();

export function getImageEmbeddableSchema(getDrilldownsSchemas: GetDrilldownsSchemaFnType) {
  return z
    .object({
      ...getDrilldownsSchemas(IMAGE_EMBEDDABLE_SUPPORTED_TRIGGERS).shape,
      ...serializedTitlesSchema.shape,
      image_config: imageConfigSchema,
    })
    .strict()
    .meta({
      description: 'Image embeddable schema',
    });
}

export type ImageConfig = z.output<typeof imageConfigSchema>;
export type ImageConfigState = z.output<typeof imageConfigSchema>;
export type ImageEmbeddableState = z.output<ReturnType<typeof getImageEmbeddableSchema>>;
