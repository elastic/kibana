/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type, ValidationError } from '@kbn/config-schema';

export const validate = (input: unknown, schema: Type<any>): ValidationError | null => {
  try {
    schema.validate(input);
    return null;
  } catch (e: any) {
    return e as ValidationError;
  }
};
