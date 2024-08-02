/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { either } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';

export const arrayToStringRt = new rt.Type<unknown[], string, unknown>(
  'arrayToString',
  rt.array(rt.unknown).is,
  (input, context) =>
    either.chain(rt.string.validate(input, context), (str) => {
      try {
        return rt.success(str.split(','));
      } catch (e) {
        return rt.failure(input, context);
      }
    }),
  (arr) => arr.join(',')
);
