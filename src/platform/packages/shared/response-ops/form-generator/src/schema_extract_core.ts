/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { addMeta, getMeta, setMeta } from './schema_connector_metadata';

interface HasUnwrap {
  unwrap(): z.ZodType;
}

const isUnwrappable = (schema: z.ZodType): schema is z.ZodType & HasUnwrap => {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodCatch ||
    schema instanceof z.ZodReadonly
  );
};

/* Some schemas are wrapped (e.g., with ZodOptional or ZodDefault), so we unwrap them to get the underlying schema
 * In the process, we also extract the default value if any
 * @param schema - The Zod schema to extract from
 * @returns An object containing the unwrapped schema and any default value
 */
export const extractSchemaCore = (schema: z.ZodType) => {
  let current = schema;
  let defaultValue: unknown;

  while (isUnwrappable(current)) {
    if (current instanceof z.ZodDefault) {
      defaultValue = current.parse(undefined);
    }

    if (current instanceof z.ZodReadonly) {
      // Readonly had no unwarp fn until v4.0.6
      // https://github.com/colinhacks/zod/issues/4951
      // This if statement can be removed when we upgrade
      current = current.def.innerType as z.ZodType;
      addMeta(current, { disabled: true });
      continue;
    }

    const actualMeta = getMeta(current);
    current = current.unwrap();
    setMeta(current, actualMeta);
  }

  // If the schema is a literal, we need it as defaultValue.
  // Works for fields that are literally a non editable value, but also
  // for hidden fields like the discriminator value in a discriminated union.
  if (current instanceof z.ZodLiteral) {
    defaultValue = current.value;
  }

  return { schema: current as z.ZodType, defaultValue };
};
