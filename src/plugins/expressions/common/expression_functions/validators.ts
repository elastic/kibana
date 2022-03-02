/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type Validator<T> = (value: T) => boolean;

/**
 * Validates that the argument belongs to the set of values.
 * @param values The set of values to validate against.
 * @returns A validator function.
 */
export function oneOf<T>(...values: T[]): Validator<T> {
  return (value: T) => {
    if (!values.includes(value)) {
      throw new Error(`"${value}" is not among the allowed options: "${values.join('", "')}"`);
    }

    return true;
  };
}
