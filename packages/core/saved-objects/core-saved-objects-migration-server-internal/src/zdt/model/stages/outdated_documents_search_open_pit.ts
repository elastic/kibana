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
import { createInitialProgress } from '../../../model/progress';
import type { ModelStage } from '../types';

export const outdatedDocumentsSearchOpenPit: ModelStage<
  'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
  'OUTDATED_DOCUMENTS_SEARCH_READ'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    throwBadResponse(state, res as never);
  }

  const pitId = res.right.pitId;

  return {
    ...state,
    controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
    pitId,
    lastHitSortValue: undefined,
    corruptDocumentIds: [],
    transformErrors: [],
    progress: createInitialProgress(),
    hasTransformedDocs: false,
  };
};
