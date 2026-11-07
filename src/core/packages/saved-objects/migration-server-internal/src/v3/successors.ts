/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Source of truth for the v3 migration state graph.
 *
 * `SUCCESSORS` lists every legal transition. Each step's `transition` is typed
 * with its row of this table, so landing outside of it is a compile error, and
 * `satisfies Record<StateName, …>` forces every state to have a row.
 */

import type { MigrationContext } from './context';
import type { IO } from './io';
import type { NonTerminalState, StateName } from './state';
import * as CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/check_cluster_routing_allocation';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS from './steps/cleanup_unknown_and_excluded_docs';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH from './steps/cleanup_unknown_and_excluded_docs_refresh';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_docs_wait_for_task';
import * as CREATE_TARGET_INDEX from './steps/create_target_index';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
import * as INDEX_STATE_UPDATE_DONE from './steps/index_state_update_done';
import * as INIT from './steps/init';
import * as OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX from './steps/outdated_documents_search_bulk_index';
import * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from './steps/outdated_documents_search_close_pit';
import * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './steps/outdated_documents_search_open_pit';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './steps/outdated_documents_search_read';
import * as OUTDATED_DOCUMENTS_SEARCH_REFRESH from './steps/outdated_documents_search_refresh';
import * as OUTDATED_DOCUMENTS_SEARCH_TRANSFORM from './steps/outdated_documents_search_transform';
import * as UPDATE_ALIASES from './steps/update_aliases';
import * as UPDATE_DOCUMENT_MODEL_VERSIONS from './steps/update_document_model_versions';
import * as UPDATE_INDEX_MAPPINGS from './steps/update_index_mappings';
import * as UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK from './steps/update_index_mappings_wait_for_task';
import * as UPDATE_MAPPING_MODEL_VERSIONS from './steps/update_mapping_model_versions';
import * as WAIT_FOR_MIGRATION_COMPLETION from './steps/wait_for_migration_completion';
import * as WAIT_FOR_YELLOW_SOURCE from './steps/wait_for_yellow_source';

/** Inspecting the index, and creating it if it doesn't exist. */
const INIT_SUCCESSORS = {
  [INIT.Name]: [
    WAIT_FOR_MIGRATION_COMPLETION.Name,
    CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
    CREATE_TARGET_INDEX.Name,
    WAIT_FOR_YELLOW_SOURCE.Name,
    INDEX_STATE_UPDATE_DONE.Name,
    INIT.Name,
    FATAL.Name,
  ],
  [WAIT_FOR_MIGRATION_COMPLETION.Name]: [WAIT_FOR_MIGRATION_COMPLETION.Name, DONE.Name, FATAL.Name],
  [CHECK_CLUSTER_ROUTING_ALLOCATION.Name]: [
    CREATE_TARGET_INDEX.Name,
    WAIT_FOR_YELLOW_SOURCE.Name,
    CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
    FATAL.Name,
  ],
  [CREATE_TARGET_INDEX.Name]: [DONE.Name, INIT.Name, CREATE_TARGET_INDEX.Name, FATAL.Name],
} as const;

/** Updating the mappings and aliases of an existing index. */
const INDEX_STATE_SUCCESSORS = {
  [WAIT_FOR_YELLOW_SOURCE.Name]: [
    UPDATE_INDEX_MAPPINGS.Name,
    UPDATE_ALIASES.Name,
    INDEX_STATE_UPDATE_DONE.Name,
    WAIT_FOR_YELLOW_SOURCE.Name,
    FATAL.Name,
  ],
  [UPDATE_INDEX_MAPPINGS.Name]: [
    UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK.Name,
    UPDATE_MAPPING_MODEL_VERSIONS.Name,
    UPDATE_ALIASES.Name,
    INDEX_STATE_UPDATE_DONE.Name,
    UPDATE_INDEX_MAPPINGS.Name,
    FATAL.Name,
  ],
  [UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK.Name]: [
    UPDATE_MAPPING_MODEL_VERSIONS.Name,
    UPDATE_INDEX_MAPPINGS.Name,
    UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK.Name,
    FATAL.Name,
  ],
  [UPDATE_MAPPING_MODEL_VERSIONS.Name]: [
    UPDATE_ALIASES.Name,
    INDEX_STATE_UPDATE_DONE.Name,
    UPDATE_MAPPING_MODEL_VERSIONS.Name,
    FATAL.Name,
  ],
  [UPDATE_ALIASES.Name]: [INDEX_STATE_UPDATE_DONE.Name, INIT.Name, UPDATE_ALIASES.Name, FATAL.Name],
  [INDEX_STATE_UPDATE_DONE.Name]: [CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.Name, DONE.Name],
} as const;

/** Cleaning up and converting the documents. */
const DOCUMENTS_SUCCESSORS = {
  [CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.Name]: [
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK.Name,
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.Name,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.Name,
    FATAL.Name,
  ],
  [CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK.Name]: [
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.Name,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.Name,
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK.Name,
    FATAL.Name,
  ],
  [CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.Name]: [
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name]: [
    OUTDATED_DOCUMENTS_SEARCH_READ.Name,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_SEARCH_READ.Name]: [
    OUTDATED_DOCUMENTS_SEARCH_TRANSFORM.Name,
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name,
    OUTDATED_DOCUMENTS_SEARCH_READ.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_SEARCH_TRANSFORM.Name]: [
    OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX.Name,
    OUTDATED_DOCUMENTS_SEARCH_READ.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX.Name]: [
    OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX.Name,
    OUTDATED_DOCUMENTS_SEARCH_READ.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name]: [
    OUTDATED_DOCUMENTS_SEARCH_REFRESH.Name,
    UPDATE_DOCUMENT_MODEL_VERSIONS.Name,
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_SEARCH_REFRESH.Name]: [
    UPDATE_DOCUMENT_MODEL_VERSIONS.Name,
    OUTDATED_DOCUMENTS_SEARCH_REFRESH.Name,
    FATAL.Name,
  ],
  [UPDATE_DOCUMENT_MODEL_VERSIONS.Name]: [
    DONE.Name,
    UPDATE_DOCUMENT_MODEL_VERSIONS.Name,
    FATAL.Name,
  ],
} as const;

const TERMINAL_SUCCESSORS = {
  [DONE.Name]: [],
  [FATAL.Name]: [],
} as const;

export const SUCCESSORS = {
  ...INIT_SUCCESSORS,
  ...INDEX_STATE_SUCCESSORS,
  ...DOCUMENTS_SUCCESSORS,
  ...TERMINAL_SUCCESSORS,
} as const satisfies Record<StateName, readonly StateName[]>;

export type SuccessorsOf<TName extends StateName> = (typeof SUCCESSORS)[TName][number];

/**
 * Dispatch table: state name → step factory. `satisfies` forces a row for every
 * non-terminal state; terminal states have no step.
 */
export const STEPS = {
  [INIT.Name]: INIT.step,
  [WAIT_FOR_MIGRATION_COMPLETION.Name]: WAIT_FOR_MIGRATION_COMPLETION.step,
  [CHECK_CLUSTER_ROUTING_ALLOCATION.Name]: CHECK_CLUSTER_ROUTING_ALLOCATION.step,
  [CREATE_TARGET_INDEX.Name]: CREATE_TARGET_INDEX.step,
  [WAIT_FOR_YELLOW_SOURCE.Name]: WAIT_FOR_YELLOW_SOURCE.step,
  [UPDATE_INDEX_MAPPINGS.Name]: UPDATE_INDEX_MAPPINGS.step,
  [UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK.Name]: UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK.step,
  [UPDATE_MAPPING_MODEL_VERSIONS.Name]: UPDATE_MAPPING_MODEL_VERSIONS.step,
  [UPDATE_ALIASES.Name]: UPDATE_ALIASES.step,
  [INDEX_STATE_UPDATE_DONE.Name]: INDEX_STATE_UPDATE_DONE.step,
  [CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.Name]: CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.step,
  [CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK.Name]:
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK.step,
  [CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.Name]: CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.step,
  [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name]: OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.step,
  [OUTDATED_DOCUMENTS_SEARCH_READ.Name]: OUTDATED_DOCUMENTS_SEARCH_READ.step,
  [OUTDATED_DOCUMENTS_SEARCH_TRANSFORM.Name]: OUTDATED_DOCUMENTS_SEARCH_TRANSFORM.step,
  [OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX.Name]: OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX.step,
  [OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name]: OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.step,
  [OUTDATED_DOCUMENTS_SEARCH_REFRESH.Name]: OUTDATED_DOCUMENTS_SEARCH_REFRESH.step,
  [UPDATE_DOCUMENT_MODEL_VERSIONS.Name]: UPDATE_DOCUMENT_MODEL_VERSIONS.step,
} as const satisfies Record<
  NonTerminalState['controlState'],
  (state: never, io: IO, context: MigrationContext) => object
>;
