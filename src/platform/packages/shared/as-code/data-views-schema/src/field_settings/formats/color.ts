/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';

const baseColorOptions = z.object({
  text: z.string().meta({
    title: 'Text color',
    description: 'The text color to use for the field.',
  }),
  background: z.string().meta({
    title: 'Background color',
    description: 'The background color to use for the field.',
  }),
});

export const colorFormatSchema = z
  .object({
    type: z.literal('color'),
    params: z.discriminatedUnion('field_type', [
      z.object({
        field_type: z.literal('string'),
        colors: z.array(
          baseColorOptions.extend({
            regex: z.string().meta({
              title: 'Regex',
              description:
                'When the field type is a string, this regex is used to determine the color.',
            }),
          })
        ),
      }),
      z.object({
        field_type: z.literal('number'),
        colors: z.array(
          baseColorOptions.extend({
            range: z.string().meta({
              title: 'Range',
              description:
                'When the field type is a number, this range is used to determine the color.',
            }),
          })
        ),
      }),
      z.object({
        field_type: z.literal('boolean'),
        colors: z.array(
          baseColorOptions.extend({
            boolean: z.boolean().meta({
              title: 'Boolean',
              description:
                'When the field type is a boolean, this boolean is used to determine the color.',
            }),
          })
        ),
      }),
    ]),
  })
  .meta({
    title: 'Color field format',
    description: 'Formats a field into a color value.',
  });
