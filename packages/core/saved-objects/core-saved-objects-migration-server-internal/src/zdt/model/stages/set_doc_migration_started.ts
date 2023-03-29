/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { throwBadResponse } from '../../../model/helpers';
import { setMetaDocMigrationStarted } from '../../utils';
import type { ModelStage } from '../types';

export const setDocMigrationStarted: ModelStage<
  'SET_DOC_MIGRATION_STARTED',
  'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    throwBadResponse(state, res as never);
  }

  return {
    ...state,
    controlState: 'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES',
    currentIndexMeta: setMetaDocMigrationStarted({
      meta: state.currentIndexMeta,
    }),
  };
};
