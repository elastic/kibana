/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import { extractUnknownDocFailureReason } from '../../../model/extract_errors';
import type { ModelStage } from '../types';
import { throwBadResponse } from '../../../model/helpers';

export const cleanupUnknownAndExcludedDocs: ModelStage<
  'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS',
  | 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK'
  | 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH'
  | 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
  | 'FATAL'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    return {
      ...state,
      controlState: 'FATAL',
      reason: extractUnknownDocFailureReason(
        context.migrationDocLinks.resolveMigrationFailures,
        res.left.unknownDocs
      ),
    };
  }

  if (res.right.type === 'cleanup_started') {
    return {
      ...state,
      controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
      deleteTaskId: res.right.taskId,
    };
  } else if (res.right.type === 'cleanup_not_needed') {
    // let's move to the step after CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK
    if (state.hasDeletedDocs) {
      return {
        ...state,
        controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH',
      };
    } else {
      return {
        ...state,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
      };
    }
  } else {
    throwBadResponse(state, res.right);
  }
};
