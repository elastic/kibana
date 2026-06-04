/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  MARKDOWN_TITLE_MAX_LENGTH,
  MARKDOWN_DESCRIPTION_MAX_LENGTH,
  MARKDOWN_CONTENT_MAX_LENGTH,
} from '../../../../common/constants';

export const markdownAttributesSchema = schema.object(
  {
    title: schema.string({
      meta: { description: 'A human-readable title' },
      maxLength: MARKDOWN_TITLE_MAX_LENGTH,
    }),
    description: schema.maybe(
      schema.string({
        meta: { description: 'A short description.' },
        maxLength: MARKDOWN_DESCRIPTION_MAX_LENGTH,
      })
    ),
    content: schema.string({
      meta: { description: 'Markdown enriched text content' },
      maxLength: MARKDOWN_CONTENT_MAX_LENGTH,
    }),
    settings: schema.maybe(
      schema.object({
        open_links_in_new_tab: schema.boolean(),
      })
    ),
  },
  { unknowns: 'forbid' }
);
