/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import { metaOrUndefined } from '../meta';

export const createComment = t.intersection([
  t.exact(
    t.type({
      comment: NonEmptyString,
    })
  ),
  t.exact(
    t.partial({
      meta: metaOrUndefined,
    })
  ),
]);

export type CreateComment = t.TypeOf<typeof createComment>;
export const createCommentsArray = t.array(createComment);
export type CreateCommentsArray = t.TypeOf<typeof createCommentsArray>;
export type CreateComments = t.TypeOf<typeof createComment>;
export const createCommentsArrayOrUndefined = t.union([createCommentsArray, t.undefined]);
export type CreateCommentsArrayOrUndefined = t.TypeOf<typeof createCommentsArrayOrUndefined>;
