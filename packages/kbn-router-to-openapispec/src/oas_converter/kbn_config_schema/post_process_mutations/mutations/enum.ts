/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { isReferenceObject } from '../../../common';

export const processEnum = (schema: OpenAPIV3.SchemaObject) => {
  if (!schema.anyOf) return;
  const result: unknown[] = [];
  let type: OpenAPIV3.SchemaObject['type'];
  for (const item of schema.anyOf!) {
    if (isReferenceObject(item) || !item.enum || !item.type) return;
    if (type && type !== item.type) return;

    type = item.type;
    result.push(...item.enum);
  }
  schema.type = type;
  schema.enum = result;
  delete schema.anyOf;
};
