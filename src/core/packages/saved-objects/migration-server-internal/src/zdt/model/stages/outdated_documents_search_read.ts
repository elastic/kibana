/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import { throwBadResponse } from '../../../model/helpers';
import type { ModelStage } from '../types';
import { logProgress, setProgressTotal } from '../../../model/progress';
import {
  extractDiscardedCorruptDocs,
  extractTransformFailuresReason,
} from '../../../model/extract_errors';

export const outdatedDocumentsSearchRead: ModelStage<
  'OUTDATED_DOCUMENTS_SEARCH_READ',
  'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM' | 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT' | 'FATAL'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    throwBadResponse(state, res as never);
  }

  let logs = state.logs;

  if (res.right.outdatedDocuments.length > 0) {
    // search returned outdated documents, so we process them
    const progress = setProgressTotal(state.progress, res.right.totalHits);
    return {
      ...state,
      pitId: res.right.pitId,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM',
      outdatedDocuments: res.right.outdatedDocuments,
      lastHitSortValue: res.right.lastHitSortValue,
      logs: logProgress(state.logs, progress),
      progress,
    };
  } else {
    // no more outdated documents , we need to move on
    if (state.corruptDocumentIds.length > 0 || state.transformErrors.length > 0) {
      if (!context.discardCorruptObjects) {
        const transformFailureReason = extractTransformFailuresReason(
          context.migrationDocLinks.resolveMigrationFailures,
          state.corruptDocumentIds,
          state.transformErrors
        );
        return {
          ...state,
          controlState: 'FATAL',
          reason: transformFailureReason,
        };
      }

      // at this point, users have configured kibana to discard corrupt objects
      // thus, we can ignore corrupt documents and transform errors and proceed with the migration
      logs = [
        ...state.logs,
        {
          level: 'warning',
          message: extractDiscardedCorruptDocs(state.corruptDocumentIds, state.transformErrors),
        },
      ];
    }

    // If there are no more results we have transformed all outdated
    // documents and we didn't encounter any corrupt documents or transformation errors
    // and can proceed to the next step
    return {
      ...state,
      pitId: res.right.pitId,
      logs,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
    };
  }
};
