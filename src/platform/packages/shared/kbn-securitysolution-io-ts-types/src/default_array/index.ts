/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the DefaultArray<C> as:
 *   - If undefined, then a default array will be set
 *   - If an array is sent in, then the array will be validated to ensure all elements are type C
 */
export const DefaultArray = <C extends t.Mixed>(codec: C) => {
  const arrType = t.array(codec);
  type ArrType = t.TypeOf<typeof arrType>;
  return new t.Type<ArrType, ArrType | undefined, unknown>(
    'DefaultArray',
    arrType.is,
    (input, context): Either<t.Errors, ArrType> =>
      input == null ? t.success([]) : arrType.validate(input, context),
    t.identity
  );
};
