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
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { DEFAULT_OBJECT_FIT, IMAGE_EMBEDDABLE_SUPPORTED_TRIGGERS } from '../common';

const imageFileSrcSchema = schema.object(
  {
    type: schema.literal('file'),
    file_id: schema.string(),
  },
  {
    meta: {
      title: 'file',
    },
  }
);

const imageUrlSrcSchema = schema.object(
  {
    type: schema.literal('url'),
    url: schema.string({
      meta: { description: 'URL of the image' },
    }),
  },
  {
    meta: {
      title: 'url',
    },
  }
);

const imageConfigSchema = schema.object({
  src: schema.oneOf([imageFileSrcSchema, imageUrlSrcSchema], {
    meta: { description: 'Image source' },
  }),
  alt_text: schema.maybe(schema.string()),
  object_fit: schema.oneOf(
    [
      schema.literal('fill'),
      schema.literal('contain'),
      schema.literal('cover'),
      schema.literal('none'),
    ],
    {
      meta: { description: 'How the image should be sized within its container' },
      defaultValue: DEFAULT_OBJECT_FIT,
    }
  ),

  background_color: schema.maybe(schema.string()),
});

export function getImageEmbeddableSchema(getDrilldownsSchemas: GetDrilldownsSchemaFnType) {
  return schema.allOf(
    [
      getDrilldownsSchemas(IMAGE_EMBEDDABLE_SUPPORTED_TRIGGERS),
      schema.object({
        image_config: imageConfigSchema,
      }),
      serializedTitlesSchema,
    ],
    {
      meta: {
        description: 'Image embeddable schema',
      },
    }
  );
}

export type ImageConfig = TypeOf<typeof imageConfigSchema>;
export type ImageConfigState = TypeOf<typeof imageConfigSchema>;
export type ImageEmbeddableState = TypeOf<ReturnType<typeof getImageEmbeddableSchema>>;
