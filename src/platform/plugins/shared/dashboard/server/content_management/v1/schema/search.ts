/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import { getDashboardAPIItemSchema, getDashboardStateSchema } from './common';

export function getDashboardSearchResultsSchema() {
  const {
    title: titleSchema,
    description: descriptionSchema,
    tags: tagsSchema,
  } = getDashboardStateSchema();
  return getDashboardAPIItemSchema().extends({
    attributes: schema.object({
      title: titleSchema,
      description: descriptionSchema,
      tags: tagsSchema,
    }),
  });
}

export const dashboardSearchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
      fields: schema.maybe(schema.arrayOf(schema.string())),
      includeReferences: schema.maybe(schema.arrayOf(schema.oneOf([schema.literal('tag')]))),
      kuery: schema.maybe(schema.string()),
      cursor: schema.maybe(schema.number()),
      limit: schema.maybe(schema.number()),
      spaces: schema.maybe(
        schema.arrayOf(schema.string(), {
          meta: {
            description:
              'An array of spaces to search or "*" to search all spaces. Defaults to the current space if not specified.',
          },
        })
      ),
    },
    { unknowns: 'forbid' }
  )
);
