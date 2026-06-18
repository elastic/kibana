/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const searchLibraryRequestSchema = schema.object({
  type: schema.oneOf([
    schema.string({ maxLength: 50 }),
    schema.arrayOf(schema.string({ maxLength: 50 }), { maxSize: 100 }),
  ]),
  search: schema.maybe(schema.string({ maxLength: 200 })),
  limit: schema.maybe(schema.number()),
  tags: schema.maybe(
    schema.object({
      included: schema.maybe(schema.arrayOf(schema.string({ maxLength: 100 }), { maxSize: 100 })),
      excluded: schema.maybe(schema.arrayOf(schema.string({ maxLength: 100 }), { maxSize: 100 })),
    })
  ),
});

export type SearchLibraryRequestType = TypeOf<typeof searchLibraryRequestSchema>;

export const searchLibraryResponseSchema = schema.object({
  hits: schema.arrayOf(schema.any(), { maxSize: 10000 }),
  total: schema.number(),
});

export type SearchLibraryResponseType = TypeOf<typeof searchLibraryResponseSchema>;
