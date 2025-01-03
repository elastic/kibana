/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { isReferenceObject } from '../../../common';

/** Identify special case output of schema.nullable() */
const isNullableOutput = (schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject) => {
  return (
    !isReferenceObject(schema) &&
    Object.keys(schema).length === 3 &&
    schema.enum?.length === 0 &&
    schema.nullable === true &&
    schema.type === undefined
  );
};

/**
 * Handle special case output of schema.nullable()
 *
 * We go from:
 * { anyOf: [ { type: 'string' }, { nullable: true, enum: [] } ] }
 *
 * To:
 * { type: 'string', nullable: true }
 */
const processNullableOutput = (schema: OpenAPIV3.SchemaObject) => {
  if (schema.anyOf!.length !== 2) return false;
  const idx = schema.anyOf!.findIndex((item) => isNullableOutput(item));
  if (idx === -1) return false;
  const anyOf = schema.anyOf!;
  delete schema.anyOf;
  schema.nullable = true;
  Object.assign(schema, anyOf[1 - idx]);
  return true;
};

const prettifyEnum = (schema: OpenAPIV3.SchemaObject) => {
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

export const processEnum = (schema: OpenAPIV3.SchemaObject) => {
  if (!schema.anyOf) return;
  if (processNullableOutput(schema)) return;
  prettifyEnum(schema);
};
