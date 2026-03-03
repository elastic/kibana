/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const bookAttributesSchema = schema.object(
  {
    title: schema.string(),
    // DO NOT COPY STRINGIFIED JSON EXAMPLE
    // Storing data as stringified JSON is not best practice.
    //
    // This example stores state as stringified JSON to show
    // how CRUD APIs should not leak storage implemenation details.
    bookJSON: schema.string(),
  },
  { unknowns: 'forbid' }
);
