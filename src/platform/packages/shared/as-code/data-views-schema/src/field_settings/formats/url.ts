/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const baseSubtypeOptionsSchema = z.object({
  url_template: z.string().optional().meta({
    title: 'URL template',
    description:
      'The template to use for the URL. The template is a string that contains the field value. The field value is replaced with the template. The available placeholders are: {{value}}, {{rawValue}} and {{risonValue}}. Use {{risonValue}} when embedding the field value inside Kibana app URL rison state (for example: query:\'{{risonValue}}\'). For example: "https://example.com/{{value}}".',
  }),
  label_template: z.string().optional().meta({
    title: 'Label template',
    description:
      'The template to use for the label. The template is a string that contains the field value. The field value is replaced with the template. The available placeholders are: {{value}}, {{rawValue}} and {{url}}. For example: "{{value}}".',
  }),
});

export const urlFormatSchema = z
  .object({
    type: z.literal('url'),
    params: z.discriminatedUnion('type', [
      baseSubtypeOptionsSchema.extend({
        type: z.literal('a').meta({
          title: 'Link',
          description: 'Displays the field value as a hyperlink.',
        }),
        open_link_in_current_tab: z.boolean().optional().meta({
          title: 'Open link in current tab',
          description:
            'When true, the URL opens in the current tab. When false or not provided, the URL opens in a new tab.',
        }),
      }),
      baseSubtypeOptionsSchema.extend({
        type: z.literal('img').meta({
          title: 'Image',
          description: 'Displays the field value as an image.',
        }),
        width: z.number().optional().meta({
          title: 'Width',
          description:
            'The width of the image. If not provided, the image will be displayed at the original width.',
        }),
        height: z.number().optional().meta({
          title: 'Height',
          description:
            'The height of the image. If not provided, the image will be displayed at the original height.',
        }),
      }),
      baseSubtypeOptionsSchema.extend({
        type: z.literal('audio').meta({
          title: 'Audio',
          description: 'Displays the field value as an audio player.',
        }),
      }),
    ]),
  })
  .meta({
    id: 'kbn-field-format-url',
    title: 'URL field format',
    description: 'Formats a field into a link, image or audio.',
  });
