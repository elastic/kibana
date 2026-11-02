/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';

type SchemaObject = OpenAPIV3.SchemaObject;
type SchemaOrRef = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

const isRef = (obj: unknown): obj is OpenAPIV3.ReferenceObject =>
  typeof obj === 'object' && obj !== null && '$ref' in obj;

const SCALAR_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

export const collapseArrayUnion = (schema: SchemaObject): SchemaObject => {
  const branches: SchemaOrRef[] | undefined = schema.anyOf ?? schema.oneOf;
  if (!branches || branches.length !== 2) return schema;

  let scalarBranch: Record<string, unknown> | undefined;
  let arrayBranch: Record<string, unknown> | undefined;

  for (const branch of branches) {
    if (isRef(branch)) return schema;
    const b = branch as Record<string, unknown>;
    if (b.type === 'array') arrayBranch = b;
    else if (SCALAR_TYPES.has(b.type as string)) scalarBranch = b;
  }

  if (!scalarBranch || !arrayBranch) return schema;

  if (arrayBranch.items && !isRef(arrayBranch.items)) {
    const items = arrayBranch.items as Record<string, unknown>;
    if (items.type !== scalarBranch.type) return schema;
  }

  if (!arrayBranch.items) {
    const inferredItems: Record<string, unknown> = { type: scalarBranch.type };
    if (scalarBranch.enum) inferredItems.enum = scalarBranch.enum;
    arrayBranch = { ...arrayBranch, items: inferredItems };
  }

  const { anyOf, oneOf, ...rest } = schema;
  return { ...rest, ...arrayBranch } as SchemaObject;
};
