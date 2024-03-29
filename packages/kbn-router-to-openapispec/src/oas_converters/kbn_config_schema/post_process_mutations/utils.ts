/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';

export const stripBadDefault = (schema: OpenAPIV3.SchemaObject): void => {
  if (schema.default?.special === 'deep') {
    if (Object.keys(schema.default).length === 1) {
      delete schema.default;
    } else {
      delete schema.default.special;
    }
  }
  // May need to revisit this...
  if (typeof schema.default === 'function') {
    const defaultValue = schema.default();
    if (defaultValue === undefined) {
      delete schema.default;
    } else {
      schema.default = defaultValue;
    }
  }
};

/** Just for type convenience */
export const deleteField = (schema: Record<any, unknown>, field: string): void => {
  delete schema[field];
};
