/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import type { State, AllActionStates } from '../state';
import type { ResponseType } from '../next';
import { delayRetryState, resetRetryState } from '../../model/retry_state';
import { throwBadControlState } from '../../model/helpers';
import { isTypeof } from '../actions';
import type { MigratorContext } from '../context';
import type { StateActionResponse } from './types';
import * as Stages from './stages';

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

  switch (current.controlState) {
    case 'INIT':
      return Stages.init(current, response as StateActionResponse<'INIT'>, context);
    case 'CREATE_TARGET_INDEX':
      return Stages.createTargetIndex(
        current,
        response as StateActionResponse<'CREATE_TARGET_INDEX'>,
        context
      );
    case 'UPDATE_ALIASES':
      return Stages.updateAliases(
        current,
        response as StateActionResponse<'UPDATE_ALIASES'>,
        context
      );
    case 'UPDATE_INDEX_MAPPINGS':
      return Stages.updateIndexMappings(
        current,
        response as StateActionResponse<'UPDATE_INDEX_MAPPINGS'>,
        context
      );
    case 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK':
      return Stages.updateIndexMappingsWaitForTask(
        current,
        response as StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'>,
        context
      );
    case 'UPDATE_MAPPING_MODEL_VERSIONS':
      return Stages.updateMappingModelVersion(
        current,
        response as StateActionResponse<'UPDATE_MAPPING_MODEL_VERSIONS'>,
        context
      );
    case 'INDEX_STATE_UPDATE_DONE':
      return Stages.indexStateUpdateDone(
        current,
        response as StateActionResponse<'INDEX_STATE_UPDATE_DONE'>,
        context
      );
    // TODO: implement
    case 'DOCUMENTS_UPDATE_INIT':
    case 'SET_DOC_MIGRATION_STARTED':
    case 'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES':
    case 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS':
    case 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK':
    case 'REFRESH_INDEX_AFTER_CLEANUP':
    case 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT':
    case 'OUTDATED_DOCUMENTS_SEARCH_READ':
    case 'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM':
    case 'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX':
    case 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT':
    case 'UPDATE_DOCUMENT_MODEL_VERSIONS':
    case 'UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES':
      return throwBadControlState(current as never);
    // TODO - end
    case 'DONE':
    case 'FATAL':
      // The state-action machine will never call the model in the terminating states
      return throwBadControlState(current as never);
    default:
      return throwBadControlState(current);
  }
};
