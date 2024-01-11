/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';

const stripDefaultDeep = (schema: OpenAPIV3.SchemaObject): void => {
  if (schema.default?.special === 'deep') {
    if (Object.keys(schema.default).length === 1) {
      delete schema.default;
    } else {
      delete schema.default.special;
    }
  }
};

const isNullable = (schema: OpenAPIV3.SchemaObject): boolean => {
  return schema.nullable === true;
};

const metaOptional = 'x-oas-optional';
const populateRequiredFields = (schema: OpenAPIV3.SchemaObject): void => {
  if (!schema.properties) return;
  const required: string[] = [];

  const entries = Object.entries(schema.properties);
  for (let x = 0; x < entries.length; x++) {
    const entry = entries[x];
    const key: string = entry[0];
    const value: OpenAPIV3.SchemaObject = entry[1] as OpenAPIV3.SchemaObject;
    if ((value as Record<string, unknown>)[metaOptional]) {
      delete (value as Record<string, unknown>)[metaOptional];
    } else if (
      Boolean(value.default != null) ||
      Boolean(value.anyOf && value.anyOf.some((v) => isNullable(v as OpenAPIV3.SchemaObject)))
    ) {
      // Do not add any of the above to the required array
    } else {
      required.push(key);
    }
  }

  schema.required = required;
};

const removeNeverType = (schema: OpenAPIV3.SchemaObject): void => {
  if (!schema.properties) return;
  for (const [key, value] of Object.entries(schema.properties)) {
    if (Object.keys(value).length === 1 && 'not' in value) {
      delete schema.properties[key];
    }
  }
};

export const processObject = (schema: OpenAPIV3.SchemaObject): void => {
  stripDefaultDeep(schema);
  removeNeverType(schema);
  populateRequiredFields(schema);
};

export const replaceRecordType = (schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
};
