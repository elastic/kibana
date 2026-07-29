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
    id: 'kbn-field-format-url-url_template',
    title: 'URL template',
    description:
      'The template to use for the URL. The template is a string that contains the field value. The field value is replaced with the template. The available placeholders are: {{value}} and {{rawValue}}. For example: "https://example.com/{{value}}".',
  }),
  label_template: z.string().optional().meta({
    id: 'kbn-field-format-url-label_template',
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
        type: z.literal('a'),
        open_link_in_current_tab: z.boolean().optional().meta({
          id: 'kbn-field-format-url-open_link_in_current_tab',
          title: 'Open in new tab',
          description:
            'Whether to open the URL in a new tab. If not provided, the URL will be opened in a new tab.',
        }),
      }),
      baseSubtypeOptionsSchema.extend({
        type: z.literal('img'),
        width: z.number().optional().meta({
          id: 'kbn-field-format-url-width',
          title: 'Width',
          description:
            'The width of the image. If not provided, the image will be displayed at the original width.',
        }),
        height: z.number().optional().meta({
          id: 'kbn-field-format-url-height',
          title: 'Height',
          description:
            'The height of the image. If not provided, the image will be displayed at the original height.',
        }),
      }),
      baseSubtypeOptionsSchema.extend({ type: z.literal('audio') }),
    ]),
  })
  .meta({
    id: 'kbn-field-format-url',
    title: 'URL field format',
    description: 'Formats a field into a link, image or audio.',
  });
