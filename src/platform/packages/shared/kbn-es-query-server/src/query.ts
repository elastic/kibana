/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from '@kbn/config-schema';

export const querySchema = <T extends string[]>(supportedLanguages?: T) => {
  const languageSchema =
    supportedLanguages && supportedLanguages.length > 0
      ? schema.oneOf(supportedLanguages.map((lang) => schema.literal(lang)) as [Type<T[number]>])
      : schema.string();

  return schema.object({
    query: schema.oneOf([
      schema.string({
        meta: {
          description:
            'A text-based query such as Kibana Query Language (KQL) or Lucene query language.',
        },
      }),
      schema.recordOf(schema.string(), schema.any()),
    ]),
    language: languageSchema,
  });
};

export const aggregateQuerySchema = schema.object({
  esql: schema.string(),
});
