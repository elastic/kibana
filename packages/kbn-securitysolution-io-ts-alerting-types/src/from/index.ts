/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';

const stringValidator = (input: unknown): input is string => typeof input === 'string';

export type From = t.TypeOf<typeof From>;
export const From = new t.Type<string, string, unknown>(
  'From',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (stringValidator(input) && parseScheduleDates(input) == null) {
      return t.failure(input, context, 'Failed to parse "from" on rule param');
    }
    return t.string.validate(input, context);
  },
  t.identity
);
