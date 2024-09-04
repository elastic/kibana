/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Type, ValidationError } from '@kbn/config-schema';

/**
 * Validate an object based on a schema.
 *
 * @param obj The object to validate
 * @param objSchema The schema to validate the object against
 * @returns null or ValidationError
 */
export const validateObj = (obj: unknown, objSchema?: Type<any>): ValidationError | null => {
  if (objSchema === undefined) {
    return null;
  }

  try {
    objSchema.validate(obj);
    return null;
  } catch (e: any) {
    return e as ValidationError;
  }
};

export { validateVersion } from '@kbn/object-versioning-utils';
