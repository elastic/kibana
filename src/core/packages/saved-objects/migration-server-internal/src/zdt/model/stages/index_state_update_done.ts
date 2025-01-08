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
import type { ModelStage } from '../types';

export const indexStateUpdateDone: ModelStage<
  'INDEX_STATE_UPDATE_DONE',
  'DOCUMENTS_UPDATE_INIT' | 'DONE'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    throwBadResponse(state, res as never);
  }

  if (state.skipDocumentMigration) {
    // we created the index, so we can safely skip the whole document migration
    // and go directly to DONE
    return {
      ...state,
      controlState: 'DONE',
    };
  } else {
    return {
      ...state,
      controlState: 'DOCUMENTS_UPDATE_INIT',
    };
  }
};
