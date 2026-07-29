/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const stringFormatSchema = z
  .object({
    type: z.literal('string'),
    params: z
      .object({
        transform: z
          .union([
            z.literal('lower').meta({
              title: 'Lower case',
              description:
                'Converts the field value to lowercase. For example: "Some Text" -> "some text".',
            }),
            z.literal('upper').meta({
              title: 'Upper case',
              description:
                'Converts the field value to uppercase. For example: "Some Text" -> "SOME TEXT".',
            }),
            z.literal('title').meta({
              title: 'Title',
              description:
                'Converts the field value to title case. For example: "some text" -> "Some Text".',
            }),
            z.literal('short').meta({
              title: 'Short dots',
              description:
                'Converts the field value to short dots. For example: "Some Text" -> "S.T.".',
            }),
            z.literal('base64').meta({
              title: 'Base64 decode',
              description:
                'Decodes the field value from base64. For example: "U29tZSBUZXh0" -> "Some Text".',
            }),
            z.literal('urlparam').meta({
              title: 'URL parameter decode',
              description:
                'Decodes the field value from URL parameter. For example: "Some%20Text" -> "Some Text".',
            }),
          ])
          .optional(),
      })
      .optional(),
  })
  .meta({
    id: 'kbn-field-format-string',
    title: 'String field format',
    description: 'Formats a field into a string value.',
  });
