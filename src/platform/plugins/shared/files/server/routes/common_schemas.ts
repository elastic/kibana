/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from '@kbn/config-schema';

export const fileName = schema.string({
  minLength: 1,
  maxLength: 256,
});

export const fileNameWithExt = schema.string({
  minLength: 1,
  maxLength: 256,
});

export const fileAlt = schema.maybe(
  schema.string({
    minLength: 1,
    maxLength: 256,
  })
);

export const page = schema.number({ min: 1, defaultValue: 1 });
export const pageSize = schema.number({ min: 1, defaultValue: 100 });

export const fileMeta = schema.maybe(
  schema.object({}, { unknowns: 'allow' })
) as unknown as Type<unknown>;
