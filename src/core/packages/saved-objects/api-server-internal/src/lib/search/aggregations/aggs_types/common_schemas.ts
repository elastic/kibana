/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema as s } from '@kbn/config-schema';

// note: these schemas are not exhaustive. See the `Sort` type of `@elastic/elasticsearch` if you need to enhance it.
const fieldSchema = s.string();
export const sortOrderSchema = s.oneOf([s.literal('asc'), s.literal('desc'), s.literal('_doc')]);
const sortModeSchema = s.oneOf([
  s.literal('min'),
  s.literal('max'),
  s.literal('sum'),
  s.literal('avg'),
  s.literal('median'),
]);
const fieldSortSchema = s.object({
  missing: s.maybe(s.oneOf([s.string(), s.number(), s.boolean()])),
  mode: s.maybe(sortModeSchema),
  order: s.maybe(sortOrderSchema),
  // nested and unmapped_type not implemented yet
});
const sortContainerSchema = s.recordOf(s.string(), s.oneOf([sortOrderSchema, fieldSortSchema]));
const sortCombinationsSchema = s.oneOf([fieldSchema, sortContainerSchema]);
export const sortSchema = s.oneOf([sortCombinationsSchema, s.arrayOf(sortCombinationsSchema)]);
