/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import { SUCCESSORS } from './successors';
import type { State } from './state';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_wait_for_task';
import * as FATAL from './steps/fatal';
import * as MARK_VERSION_INDEX_READY from './steps/mark_version_index_ready';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './steps/outdated_documents_search_read';
import * as UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK from './steps/update_target_mappings_properties_wait_for_task';

const assertInvariant = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(`Invalid v3 migration state: ${message}`);
  }
};

const isKnownStateName = (name: State['name']): boolean =>
  Object.prototype.hasOwnProperty.call(SUCCESSORS, name);

export const assertInvariants = (state: State): void => {
  assertInvariant(isKnownStateName(state.name), `unknown state name ${state.name}`);
  assertInvariant(Number.isInteger(state.retryAttempts), 'retryAttempts must be an integer');
  assertInvariant(state.retryAttempts >= 0, 'retryAttempts must be greater than or equal to 0');
  assertInvariant(Number.isInteger(state.retryCount), 'retryCount must be an integer');
  assertInvariant(state.retryCount >= 0, 'retryCount must be greater than or equal to 0');
  assertInvariant(
    state.retryCount <= state.retryAttempts,
    'retryCount must not exceed retryAttempts'
  );

  if (state.name === FATAL.Name) {
    assertInvariant(state.reason.length > 0, 'FATAL requires reason');
  }

  if (state.name === CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name) {
    assertInvariant(state.deleteByQueryTaskId.length > 0, 'deleteByQueryTaskId required');
  }

  if (state.name === UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name) {
    assertInvariant(
      state.updateTargetMappingsTaskId.length > 0,
      'updateTargetMappingsTaskId required'
    );
  }

  if (state.name === OUTDATED_DOCUMENTS_SEARCH_READ.Name) {
    assertInvariant(state.pitId.length > 0, 'pitId required for OUTDATED_DOCUMENTS_SEARCH_READ');
  }

  if (state.name === MARK_VERSION_INDEX_READY.Name) {
    assertInvariant(
      Option.isSome(state.versionIndexReadyActions),
      'versionIndexReadyActions required'
    );
  }
};
