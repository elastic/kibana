/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z3 from 'zod/v3';
import type * as z4 from 'zod/v4/core';

export const isZod = (schema: z3.ZodTypeAny | z4.$ZodType) => {
  if ('_zod' in schema) {
    return true; // v4
  } else if (schema instanceof z3.ZodType) {
    return true; // v3
  }
  return false;
};
