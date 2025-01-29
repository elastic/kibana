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
import { incrementProcessedProgress } from '../../../model/progress';
import { fatalReasonDocumentExceedsMaxBatchSizeBytes } from '../../../model/extract_errors';
import { createBatches } from '../../../model/create_batches';
import { isTypeof } from '../../actions';

export const outdatedDocumentsSearchTransform: ModelStage<
  'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM',
  'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX' | 'OUTDATED_DOCUMENTS_SEARCH_READ' | 'FATAL'
> = (state, res, context) => {
  // Increment the processed documents, no matter what the results are.
  // Otherwise the progress might look off when there are errors.
  const progress = incrementProcessedProgress(state.progress, state.outdatedDocuments.length);
  const discardCorruptObjects = context.discardCorruptObjects;
  if (
    Either.isRight(res) ||
    (isTypeof(res.left, 'documents_transform_failed') && discardCorruptObjects)
  ) {
    // we might have some transformation errors, but user has chosen to discard them
    if (
      (state.corruptDocumentIds.length === 0 && state.transformErrors.length === 0) ||
      discardCorruptObjects
    ) {
      const documents = Either.isRight(res) ? res.right.processedDocs : res.left.processedDocs;

      let corruptDocumentIds = state.corruptDocumentIds;
      let transformErrors = state.transformErrors;

      if (Either.isLeft(res)) {
        corruptDocumentIds = [...state.corruptDocumentIds, ...res.left.corruptDocumentIds];
        transformErrors = [...state.transformErrors, ...res.left.transformErrors];
      }

      const batches = createBatches({
        documents,
        corruptDocumentIds,
        transformErrors,
        maxBatchSizeBytes: context.migrationConfig.maxBatchSizeBytes.getValueInBytes(),
      });
      if (Either.isRight(batches)) {
        return {
          ...state,
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX',
          bulkOperationBatches: batches.right,
          currentBatch: 0,
          hasTransformedDocs: true,
          progress,
        };
      } else {
        return {
          ...state,
          controlState: 'FATAL',
          reason: fatalReasonDocumentExceedsMaxBatchSizeBytes({
            _id: batches.left.documentId,
            docSizeBytes: batches.left.docSizeBytes,
            maxBatchSizeBytes: batches.left.maxBatchSizeBytes,
          }),
        };
      }
    } else {
      // We have seen corrupt documents and/or transformation errors
      // skip indexing and go straight to reading and transforming more docs
      return {
        ...state,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
        progress,
      };
    }
  } else {
    if (isTypeof(res.left, 'documents_transform_failed')) {
      // continue to build up any more transformation errors before failing the migration.
      return {
        ...state,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
        corruptDocumentIds: [...state.corruptDocumentIds, ...res.left.corruptDocumentIds],
        transformErrors: [...state.transformErrors, ...res.left.transformErrors],
        hasTransformedDocs: false,
        progress,
      };
    } else {
      throwBadResponse(state, res as never);
    }
  }
};
