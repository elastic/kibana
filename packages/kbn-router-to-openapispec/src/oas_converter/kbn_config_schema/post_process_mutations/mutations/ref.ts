/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { tryConvertToRef } from '../../lib';
import type { Context } from '..';

export const processRef = (ctx: Context, schema: OpenAPIV3.SchemaObject) => {
  const result = tryConvertToRef(schema);
  if (result) {
    const [id, s] = result.idSchema;
    ctx.sharedSchemas.set(id, s);
    return result.ref;
  }
};
