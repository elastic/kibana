/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Type, ValidationError } from '@kbn/config-schema';
import { Version } from './types';

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

export const validateVersion = (
  version: unknown
): { result: true; value: Version } | { result: false; value: null } => {
  if (typeof version === 'string') {
    const isValid = /^\d+$/.test(version);
    if (isValid) {
      const parsed = parseInt(version, 10);
      if (Number.isNaN(parsed)) {
        return { result: false, value: null };
      }
      return { result: true, value: parsed };
    }
    return { result: false, value: null };
  } else {
    const isValid = Number.isInteger(version);
    if (isValid) {
      return {
        result: true,
        value: version as Version,
      };
    }
    return {
      result: false,
      value: null,
    };
  }
};
