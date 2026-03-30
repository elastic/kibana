/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { baseMetaSchema, createdMetaSchema, updatedMetaSchema } from '../meta_schemas';
import { markdownAttributesSchema } from '../../markdown_saved_object/schema/v1';
import { validateMarkdownId } from './validate_markdown_id';

export const createRequestParamsSchema = schema.maybe(
  schema.object(
    {
      id: schema.maybe(
        schema.string({
          meta: {
            description:
              'A unique identifier for the markdown panel. Must contain only lowercase letters, numbers, hyphens, and underscores.',
          },
          validate: (value) => {
            if (!validateMarkdownId(value)) {
              return 'ID must contain only lowercase letters, numbers, hyphens, and underscores.';
            }
          },
          minLength: 1,
          maxLength: 250,
        })
      ),
    },
    { unknowns: 'forbid' }
  )
);

export const createRequestBodySchema = markdownAttributesSchema;

export const createResponseBodySchema = schema.object({
  id: schema.string(),
  data: markdownAttributesSchema,
  meta: schema.allOf([baseMetaSchema, createdMetaSchema, updatedMetaSchema]),
});
