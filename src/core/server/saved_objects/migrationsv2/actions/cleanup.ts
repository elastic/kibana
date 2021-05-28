/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { closePit } from './index';
import { ElasticsearchClient } from '../../../elasticsearch';
import { RetryableEsClientError } from './catch_retryable_es_client_errors';

export interface CleanupFailed {
  type: 'cleanup_failed';
  // adding properties to pass through the closePit error that we surface when logging migration transitions
  cleanupFatalError: RetryableEsClientError;
}
export interface CleanupSuccess {
  type: 'cleanup_complete' | 'cleanup_closepit_skipped';
}
/**
 * Performs clean up steps before failing the migration
 * If more cleanup steps are needed, use chaining here. See waitForReindexTask for implementation example
 */
const cleanupFatal = (
  client: ElasticsearchClient,
  pitId?: string
): TaskEither.TaskEither<CleanupFailed, CleanupSuccess> => async () => {
  if (!pitId) return Either.right({ type: 'cleanup_closepit_skipped' }); // there's nothing to do here, we simply pass through
  const result = await closePit(client, pitId)();
  if (result._tag === 'Right') {
    return Either.right({ type: 'cleanup_complete' });
  } else {
    const cleanupFatalError = { ...result.left };
    return Either.left({ type: 'cleanup_failed', cleanupFatalError }); // passing through the error from closePit
  }
};

/**
 * Performs clean up steps before failing the migration
 * If more cleanup steps are needed, use chaining here. See waitForReindexTask for implementation example
 */
const cleanupBadResponse = (
  client: ElasticsearchClient,
  pitId?: string
): TaskEither.TaskEither<CleanupFailed, CleanupSuccess> => async () => {
  if (!pitId) return Either.right({ type: 'cleanup_closepit_skipped' }); // there's nothing to do here, we simply pass through
  const result = await closePit(client, pitId)();
  if (result._tag === 'Right') {
    return Either.right({ type: 'cleanup_complete' });
  } else {
    const cleanupFatalError = { ...result.left };
    return Either.left({ type: 'cleanup_failed', cleanupFatalError }); // passing through the error from closePit
  }
};

// allows us to create mocks for the module
// might need to modify the export type a bit here
export const cleanup = { cleanupFatal, cleanupBadResponse };
