/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { importComment, ImportCommentsArray } from '../import_comment';

/**
 * Types the DefaultImportCommentsArray as:
 *   - If null or undefined, then a default array of type ImportCommentsArray will be set
 */
export const DefaultImportCommentsArray = new t.Type<
  ImportCommentsArray,
  ImportCommentsArray,
  unknown
>(
  'DefaultImportComments',
  t.array(importComment).is,
  (input, context): Either<t.Errors, ImportCommentsArray> =>
    input == null ? t.success([]) : t.array(importComment).validate(input, context),
  t.identity
);
