/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { RuleActionArray } from '../actions';

export const DefaultActionsArray = new t.Type<
  RuleActionArray,
  RuleActionArray | undefined,
  unknown
>(
  'DefaultActionsArray',
  RuleActionArray.is,
  (input, context): Either<t.Errors, RuleActionArray> =>
    input == null ? t.success([]) : RuleActionArray.validate(input, context),
  t.identity
);
