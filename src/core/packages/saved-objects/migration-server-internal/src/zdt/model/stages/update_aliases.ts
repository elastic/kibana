/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { throwBadResponse } from '../../../model/helpers';
import { isTypeof } from '../../actions';
import type { ModelStage } from '../types';

export const updateAliases: ModelStage<'UPDATE_ALIASES', 'INDEX_STATE_UPDATE_DONE' | 'FATAL'> = (
  state,
  res,
  context
) => {
  if (Either.isLeft(res)) {
    const left = res.left;
    if (isTypeof(left, 'alias_not_found_exception')) {
      // Should never occur given a single operator is supposed to perform the migration.
      // we just terminate in that case
      return {
        ...state,
        controlState: 'FATAL',
        reason: `Alias missing during alias update`,
      };
    } else if (isTypeof(left, 'index_not_found_exception')) {
      // Should never occur given a single operator is supposed to perform the migration.
      // we just terminate in that case
      return {
        ...state,
        controlState: 'FATAL',
        reason: `Index ${left.index} missing during alias update`,
      };
    } else {
      throwBadResponse(state, left as never);
    }
  }

  return {
    ...state,
    controlState: 'INDEX_STATE_UPDATE_DONE',
  };
};
