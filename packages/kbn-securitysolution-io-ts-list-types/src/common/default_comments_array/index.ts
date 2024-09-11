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
import { comment, CommentsArray } from '../comment';

/**
 * Types the DefaultCommentsArray as:
 *   - If null or undefined, then a default array of type entry will be set
 */
export const DefaultCommentsArray = new t.Type<CommentsArray, CommentsArray, unknown>(
  'DefaultCommentsArray',
  t.array(comment).is,
  (input): Either<t.Errors, CommentsArray> =>
    input == null ? t.success([]) : t.array(comment).decode(input),
  t.identity
);
