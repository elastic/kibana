/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { updateCommentsArray, UpdateCommentsArray } from '../update_comment';

/**
 * Types the DefaultUpdateComments as:
 *   - If null or undefined, then a default array of type UpdateCommentsArray will be set
 */
export const DefaultUpdateCommentsArray = new t.Type<
  UpdateCommentsArray,
  UpdateCommentsArray,
  unknown
>(
  'DefaultUpdateComments',
  updateCommentsArray.is,
  (input, context): Either<t.Errors, UpdateCommentsArray> =>
    input == null ? t.success([]) : updateCommentsArray.validate(input, context),
  t.identity
);
