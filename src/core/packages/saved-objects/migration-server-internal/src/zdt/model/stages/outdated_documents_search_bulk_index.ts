/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { FATAL_REASON_REQUEST_ENTITY_TOO_LARGE } from '../../../common/constants';
import { throwBadResponse } from '../../../model/helpers';
import { isTypeof } from '../../actions';
import type { ModelStage } from '../types';

export const outdatedDocumentsSearchBulkIndex: ModelStage<
  'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX',
  'OUTDATED_DOCUMENTS_SEARCH_READ' | 'FATAL'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    if (isTypeof(res.left, 'request_entity_too_large_exception')) {
      return {
        ...state,
        controlState: 'FATAL',
        reason: FATAL_REASON_REQUEST_ENTITY_TOO_LARGE,
      };
    } else if (
      isTypeof(res.left, 'target_index_had_write_block') ||
      isTypeof(res.left, 'index_not_found_exception')
    ) {
      // we fail on these errors since the target index will never get
      // deleted and should only have a write block if a newer version of
      // Kibana started an upgrade
      throwBadResponse(state, res.left as never);
    } else {
      throwBadResponse(state, res.left);
    }
  }

  if (state.currentBatch + 1 < state.bulkOperationBatches.length) {
    return {
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX',
      currentBatch: state.currentBatch + 1,
    };
  }
  return {
    ...state,
    controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
    corruptDocumentIds: [],
    transformErrors: [],
    hasTransformedDocs: true,
  };
};
