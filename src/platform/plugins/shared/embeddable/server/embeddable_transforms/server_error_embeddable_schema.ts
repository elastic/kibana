/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { referenceSchema } from '@kbn/content-management-utils';

export const serverErrorEmbeddableSchema = schema.object({
  original_config: schema.object(
    {},
    {
      unknowns: 'allow',
    }
  ),
  original_references: schema.maybe(schema.arrayOf(referenceSchema)),
  original_type: schema.string(),
  error: schema.string(),
});

export type ServerErrorEmbeddableState = TypeOf<typeof serverErrorEmbeddableSchema>;
