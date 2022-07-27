/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Creates a schema of an array that works in the following way:
 *   - If input is a CSV string, it will be parsed to an array which will be validated.
 *   - If input is an array, each item is validated to match `itemSchema`.
 *   - If input is a single string, it is validated to match `itemSchema`.
 *   - If input is not specified, the result will be set to [] (empty array):
 *     - null, undefined, empty string, empty array
 *
 * In all cases when an input is valid, the resulting decoded value will be an array,
 * either an empty one or containing valid items.
 *
 * @param itemSchema Schema of the array's items.
 * @param name (Optional) Name of the resulting schema.
 */
export const defaultCsvArray = <TItem>(
  itemSchema: t.Type<TItem>,
  name?: string
): t.Type<TItem[]> => {
  return new t.Type<TItem[]>(
    name ?? `DefaultCsvArray<${itemSchema.name}>`,
    t.array(itemSchema).is,
    (input, context): Either<t.Errors, TItem[]> => {
      if (input == null) {
        return t.success([]);
      } else if (typeof input === 'string') {
        if (input === '') {
          return t.success([]);
        } else {
          return t.array(itemSchema).validate(input.split(','), context);
        }
      } else {
        return t.array(itemSchema).validate(input, context);
      }
    },
    t.identity
  );
};
