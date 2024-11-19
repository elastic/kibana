/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import { created_at } from '../created_at';
import { created_by } from '../created_by';
import { id } from '../id';
import { updated_at } from '../updated_at';
import { updated_by } from '../updated_by';

export const comment = t.intersection([
  t.exact(
    t.type({
      comment: NonEmptyString,
      created_at,
      created_by,
      id,
    })
  ),
  t.exact(
    t.partial({
      updated_at,
      updated_by,
    })
  ),
]);

export const commentsArray = t.array(comment);
export type CommentsArray = t.TypeOf<typeof commentsArray>;
export type Comment = t.TypeOf<typeof comment>;
export const commentsArrayOrUndefined = t.union([commentsArray, t.undefined]);
export type CommentsArrayOrUndefined = t.TypeOf<typeof commentsArrayOrUndefined>;
