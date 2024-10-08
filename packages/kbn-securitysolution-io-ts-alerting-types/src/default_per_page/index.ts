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
import { PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';

/**
 * Types the DefaultPerPage as:
 *   - If a string this will convert the string to a number
 *   - If null or undefined, then a default of 20 will be used
 *   - If the number is 0 or less this will not validate as it has to be a positive number greater than zero
 */
export const DefaultPerPage = new t.Type<number, number | undefined, unknown>(
  'DefaultPerPage',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    if (input == null) {
      return t.success(20);
    } else if (typeof input === 'string') {
      return PositiveIntegerGreaterThanZero.validate(parseInt(input, 10), context);
    } else {
      return PositiveIntegerGreaterThanZero.validate(input, context);
    }
  },
  t.identity
);
