/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IO } from './io';
import type { NonTerminalState, State } from './state';
import { assertNever, runStep } from './types';
import * as CHECK_TARGET_MAPPINGS from './steps/check_target_mappings';
import * as CHECK_VERSION_INDEX_READY_ACTIONS from './steps/check_version_index_ready_actions';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED from './steps/cleanup_unknown_and_excluded';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_wait_for_task';
import * as COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/compatible_update_check_cluster_routing_allocation';
import * as CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/create_index_check_cluster_routing_allocation';
import * as CREATE_NEW_TARGET from './steps/create_new_target';
import * as INIT from './steps/init';
import * as MARK_VERSION_INDEX_READY from './steps/mark_version_index_ready';
import * as MARK_VERSION_INDEX_READY_CONFLICT from './steps/mark_version_index_ready_conflict';
import * as OUTDATED_DOCUMENTS_REFRESH from './steps/outdated_documents_refresh';
import * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from './steps/outdated_documents_search_close_pit';
import * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './steps/outdated_documents_search_open_pit';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './steps/outdated_documents_search_read';
import * as OUTDATED_DOCUMENTS_TRANSFORM from './steps/outdated_documents_transform';
import * as PREPARE_COMPATIBLE_MIGRATION from './steps/prepare_compatible_migration';
import * as REFRESH_SOURCE from './steps/refresh_source';
import * as TRANSFORMED_DOCUMENTS_BULK_INDEX from './steps/transformed_documents_bulk_index';
import * as UPDATE_SOURCE_MAPPINGS_PROPERTIES from './steps/update_source_mappings_properties';
import * as UPDATE_TARGET_MAPPINGS_META from './steps/update_target_mappings_meta';
import * as UPDATE_TARGET_MAPPINGS_PROPERTIES from './steps/update_target_mappings_properties';
import * as UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK from './steps/update_target_mappings_properties_wait_for_task';
import * as WAIT_FOR_MIGRATION_COMPLETION from './steps/wait_for_migration_completion';
import * as WAIT_FOR_YELLOW_SOURCE from './steps/wait_for_yellow_source';

export const next = async (state: NonTerminalState, io: IO): Promise<State> => {
  switch (state.name) {
    case INIT.Name:
      return runStep(INIT.step(state, io));
    case WAIT_FOR_MIGRATION_COMPLETION.Name:
      return runStep(WAIT_FOR_MIGRATION_COMPLETION.step(state, io));
    case WAIT_FOR_YELLOW_SOURCE.Name:
      return runStep(WAIT_FOR_YELLOW_SOURCE.step(state, io));
    case UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name:
      return runStep(UPDATE_SOURCE_MAPPINGS_PROPERTIES.step(state, io));
    case COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name:
      return runStep(COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.step(state, io));
    case CLEANUP_UNKNOWN_AND_EXCLUDED.Name:
      return runStep(CLEANUP_UNKNOWN_AND_EXCLUDED.step(state, io));
    case CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name:
      return runStep(CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.step(state, io));
    case PREPARE_COMPATIBLE_MIGRATION.Name:
      return runStep(PREPARE_COMPATIBLE_MIGRATION.step(state, io));
    case REFRESH_SOURCE.Name:
      return runStep(REFRESH_SOURCE.step(state, io));
    case CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name:
      return runStep(CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.step(state, io));
    case CREATE_NEW_TARGET.Name:
      return runStep(CREATE_NEW_TARGET.step(state, io));
    case CHECK_TARGET_MAPPINGS.Name:
      return runStep(CHECK_TARGET_MAPPINGS.step(state, io));
    case UPDATE_TARGET_MAPPINGS_PROPERTIES.Name:
      return runStep(UPDATE_TARGET_MAPPINGS_PROPERTIES.step(state, io));
    case UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name:
      return runStep(UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.step(state, io));
    case UPDATE_TARGET_MAPPINGS_META.Name:
      return runStep(UPDATE_TARGET_MAPPINGS_META.step(state, io));
    case CHECK_VERSION_INDEX_READY_ACTIONS.Name:
      return runStep(CHECK_VERSION_INDEX_READY_ACTIONS.step(state, io));
    case OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name:
      return runStep(OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.step(state, io));
    case OUTDATED_DOCUMENTS_SEARCH_READ.Name:
      return runStep(OUTDATED_DOCUMENTS_SEARCH_READ.step(state, io));
    case OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name:
      return runStep(OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.step(state, io));
    case OUTDATED_DOCUMENTS_REFRESH.Name:
      return runStep(OUTDATED_DOCUMENTS_REFRESH.step(state, io));
    case OUTDATED_DOCUMENTS_TRANSFORM.Name:
      return runStep(OUTDATED_DOCUMENTS_TRANSFORM.step(state, io));
    case TRANSFORMED_DOCUMENTS_BULK_INDEX.Name:
      return runStep(TRANSFORMED_DOCUMENTS_BULK_INDEX.step(state, io));
    case MARK_VERSION_INDEX_READY.Name:
      return runStep(MARK_VERSION_INDEX_READY.step(state, io));
    case MARK_VERSION_INDEX_READY_CONFLICT.Name:
      return runStep(MARK_VERSION_INDEX_READY_CONFLICT.step(state, io));
    default:
      return assertNever(state);
  }
};
