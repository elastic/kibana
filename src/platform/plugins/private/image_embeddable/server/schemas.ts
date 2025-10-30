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

const imageFileSrcSchema = schema.object({
  type: schema.literal('file'),
  fileId: schema.string(),
  fileImageMeta: schema.maybe(
    schema.object({
      blurHash: schema.maybe(schema.string()),
      width: schema.number({
        meta: { description: 'Width of the image in pixels' },
      }),
      height: schema.number({
        meta: { description: 'Height of the image in pixels' },
      }),
    })
  ),
});

const imageUrlSrcSchema = schema.object({
  type: schema.literal('url'),
  url: schema.string({
    meta: { description: 'URL of the image' },
  }),
});

const imageConfigSchema = schema.object({
  src: schema.oneOf([imageFileSrcSchema, imageUrlSrcSchema], {
    meta: { description: 'Image source (file or URL)' },
  }),
  altText: schema.maybe(schema.string()),
  sizing: schema.object({
    objectFit: schema.oneOf(
      [
        schema.literal('fill'),
        schema.literal('contain'),
        schema.literal('cover'),
        schema.literal('none'),
      ],
      {
        meta: { description: 'How the image should be sized within its container' },
      }
    ),
  }),
  backgroundColor: schema.maybe(schema.string()),
});

export const imageEmbeddableSchema = schema.allOf(
  [
    schema.object({
      imageConfig: imageConfigSchema,
      enhancements: schema.maybe(schema.any()),
    }),
    serializedTitlesSchema,
  ],
  {
    meta: {
      description: 'Image embeddable schema',
    },
  }
);

export type ImageConfig = TypeOf<typeof imageConfigSchema>;
export type ImageConfigState = TypeOf<typeof imageConfigSchema>;
export type ImageEmbeddableState = TypeOf<typeof imageEmbeddableSchema>;
