/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as z from 'zod';

/**
 * This is a helper schema to convert comma separated strings to arrays. Useful
 * for processing query params.
 *
 * @param schema Array items schema
 * @returns Array schema that accepts a comma-separated string as input
 */
export function ArrayFromString<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value: unknown) =>
      typeof value === 'string' ? (value === '' ? [] : value.split(',')) : value,
    z.array(schema)
  );
}
