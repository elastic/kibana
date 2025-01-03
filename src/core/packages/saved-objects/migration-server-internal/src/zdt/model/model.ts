/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import type { State, AllActionStates } from '../state';
import type { ResponseType } from '../next';
import { delayRetryState, resetRetryState } from '../../model/retry_state';
import { throwBadControlState } from '../../model/helpers';
import { isTypeof } from '../actions';
import type { MigratorContext } from '../context';
import type { ModelStage } from './types';
import * as Stages from './stages';

type ModelStageMap = {
  [K in AllActionStates]: ModelStage<K, any>;
};

type AnyModelStageHandler = (
  state: State,
  response: Either.Either<unknown, unknown>,
  ctx: MigratorContext
) => State;

export const modelStageMap: ModelStageMap = {
  INIT: Stages.init,
  CREATE_TARGET_INDEX: Stages.createTargetIndex,
  UPDATE_ALIASES: Stages.updateAliases,
  UPDATE_INDEX_MAPPINGS: Stages.updateIndexMappings,
  UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK: Stages.updateIndexMappingsWaitForTask,
  UPDATE_MAPPING_MODEL_VERSIONS: Stages.updateMappingModelVersion,
  INDEX_STATE_UPDATE_DONE: Stages.indexStateUpdateDone,
  DOCUMENTS_UPDATE_INIT: Stages.documentsUpdateInit,
  SET_DOC_MIGRATION_STARTED: Stages.setDocMigrationStarted,
  SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES: Stages.setDocMigrationStartedWaitForInstances,
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS: Stages.cleanupUnknownAndExcludedDocs,
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK: Stages.cleanupUnknownAndExcludedDocsWaitForTask,
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH: Stages.cleanupUnknownAndExcludedDocsRefresh,
  OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT: Stages.outdatedDocumentsSearchOpenPit,
  OUTDATED_DOCUMENTS_SEARCH_READ: Stages.outdatedDocumentsSearchRead,
  OUTDATED_DOCUMENTS_SEARCH_TRANSFORM: Stages.outdatedDocumentsSearchTransform,
  OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX: Stages.outdatedDocumentsSearchBulkIndex,
  OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: Stages.outdatedDocumentsSearchClosePit,
  OUTDATED_DOCUMENTS_SEARCH_REFRESH: Stages.outdatedDocumentsSearchRefresh,
  UPDATE_DOCUMENT_MODEL_VERSIONS: Stages.updateDocumentModelVersion,
  UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES:
    Stages.updateDocumentModelVersionWaitForInstances,
};

export const model = (
  current: State,
  response: ResponseType<AllActionStates>,
  context: MigratorContext
): State => {
  if (Either.isLeft<unknown, unknown>(response)) {
    if (isTypeof(response.left, 'retryable_es_client_error')) {
      return delayRetryState(current, response.left.message, context.maxRetryAttempts);
    }
  } else {
    current = resetRetryState(current);
  }

  if (current.controlState === 'DONE' || current.controlState === 'FATAL') {
    return throwBadControlState(current as never);
  }

  const stageHandler = modelStageMap[current.controlState] as AnyModelStageHandler;
  if (!stageHandler) {
    return throwBadControlState(current as never);
  }

  return stageHandler(current, response, context);
};
