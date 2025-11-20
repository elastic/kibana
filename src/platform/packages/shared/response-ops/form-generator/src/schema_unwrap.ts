/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

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

export const unwrap = (schema: z.ZodType) => {
  let current = schema;
  let defaultValue: unknown;

  while (isUnwrappable(current)) {
    if (current instanceof z.ZodDefault) {
      defaultValue = current.parse(undefined);
    }
    current = current.unwrap();
  }

  return { schema: current as z.ZodType, defaultValue };
};
