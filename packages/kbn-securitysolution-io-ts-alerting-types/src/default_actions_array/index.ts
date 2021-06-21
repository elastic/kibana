/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { actions, Actions } from '../actions';

export const DefaultActionsArray = new t.Type<Actions, Actions | undefined, unknown>(
  'DefaultActionsArray',
  actions.is,
  (input, context): Either<t.Errors, Actions> =>
    input == null ? t.success([]) : actions.validate(input, context),
  t.identity
);
