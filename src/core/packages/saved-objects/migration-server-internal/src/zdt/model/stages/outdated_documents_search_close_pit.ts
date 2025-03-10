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

export const outdatedDocumentsSearchClosePit: ModelStage<
  'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
  'OUTDATED_DOCUMENTS_SEARCH_REFRESH' | 'UPDATE_DOCUMENT_MODEL_VERSIONS'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    throwBadResponse(state, res as never);
  }

  const { hasTransformedDocs } = state;
  if (hasTransformedDocs) {
    return {
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_REFRESH',
    };
  } else {
    return {
      ...state,
      controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS',
    };
  }
};
