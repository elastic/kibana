/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const savedBookAttributesBaseSchema = schema.object({
  // Keys from V1. None of these can be removed, any new keys added in the future must be optional or have default values
  bookTitle: schema.string(),
  authorName: schema.string(),
  numberOfPages: schema.number(),
  bookSynopsis: schema.maybe(schema.string()),
});

export const savedBookAttributesSchema = savedBookAttributesBaseSchema.extends({
  publicationYear: schema.maybe(schema.number()),
});
