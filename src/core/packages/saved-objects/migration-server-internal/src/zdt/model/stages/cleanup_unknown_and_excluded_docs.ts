/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { extractUnknownDocFailureReason } from '../../../model/extract_errors';
import type { ModelStage } from '../types';

export const cleanupUnknownAndExcludedDocs: ModelStage<
  'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS',
  'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK' | 'FATAL'
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

  return {
    ...state,
    controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
    deleteTaskId: res.right.taskId,
  };
};
