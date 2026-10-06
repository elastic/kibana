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
 * `SUCCESSORS` lists every legal transition. Each step file's `transition` is
 * constrained by `Step<SuccessorsOf<typeof Name>, ...>`, so a transition that
 * lands outside its row in this table is a compile error. The
 * `satisfies Record<StateName, …>` annotation forces every state to appear as
 * a key — adding a state to the union without a row here will not compile.
 *
 * Sub-tables are grouped by phase for review; the merged `SUCCESSORS` export
 * is the only thing the rest of the code (and tests) reads.
 */

import type { NonTerminalState, StateName, StateOf } from './state';
import * as CHECK_TARGET_MAPPINGS from './steps/check_target_mappings';
import * as CHECK_VERSION_INDEX_READY_ACTIONS from './steps/check_version_index_ready_actions';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED from './steps/cleanup_unknown_and_excluded';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_wait_for_task';
import * as COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/compatible_update_check_cluster_routing_allocation';
import * as CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/create_index_check_cluster_routing_allocation';
import * as CREATE_NEW_TARGET from './steps/create_new_target';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
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

/** INIT / bootstrap */
const INIT_SUCCESSORS = {
  [INIT.Name]: [
    WAIT_FOR_MIGRATION_COMPLETION.Name,
    WAIT_FOR_YELLOW_SOURCE.Name,
    CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
    INIT.Name,
    FATAL.Name,
  ],
} as const;

/** Compatible migration path (source exists) */
const COMPATIBLE_SUCCESSORS = {
  [WAIT_FOR_YELLOW_SOURCE.Name]: [
    UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name,
    WAIT_FOR_YELLOW_SOURCE.Name,
    FATAL.Name,
  ],
  [UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name]: [
    COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
    UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name,
    FATAL.Name,
  ],
  [COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name]: [
    CLEANUP_UNKNOWN_AND_EXCLUDED.Name,
    COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
    FATAL.Name,
  ],
  [CLEANUP_UNKNOWN_AND_EXCLUDED.Name]: [
    CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name,
    PREPARE_COMPATIBLE_MIGRATION.Name,
    CLEANUP_UNKNOWN_AND_EXCLUDED.Name,
    FATAL.Name,
  ],
  [CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name]: [
    PREPARE_COMPATIBLE_MIGRATION.Name,
    CLEANUP_UNKNOWN_AND_EXCLUDED.Name,
    CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name,
    FATAL.Name,
  ],
  [PREPARE_COMPATIBLE_MIGRATION.Name]: [
    REFRESH_SOURCE.Name,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
    PREPARE_COMPATIBLE_MIGRATION.Name,
    FATAL.Name,
  ],
  [REFRESH_SOURCE.Name]: [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name, REFRESH_SOURCE.Name, FATAL.Name],
} as const;

/** Fresh cluster / create target path */
const CREATE_INDEX_SUCCESSORS = {
  [CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name]: [
    CREATE_NEW_TARGET.Name,
    CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
    FATAL.Name,
  ],
  [CREATE_NEW_TARGET.Name]: [
    CHECK_VERSION_INDEX_READY_ACTIONS.Name,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
    CREATE_NEW_TARGET.Name,
    FATAL.Name,
  ],
} as const;

/** Outdated documents pipeline */
const OUTDATED_DOCUMENTS_SUCCESSORS = {
  [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name]: [
    OUTDATED_DOCUMENTS_SEARCH_READ.Name,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_SEARCH_READ.Name]: [
    OUTDATED_DOCUMENTS_TRANSFORM.Name,
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name,
    OUTDATED_DOCUMENTS_SEARCH_READ.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_TRANSFORM.Name]: [
    TRANSFORMED_DOCUMENTS_BULK_INDEX.Name,
    OUTDATED_DOCUMENTS_SEARCH_READ.Name,
    OUTDATED_DOCUMENTS_TRANSFORM.Name,
    FATAL.Name,
  ],
  [TRANSFORMED_DOCUMENTS_BULK_INDEX.Name]: [
    TRANSFORMED_DOCUMENTS_BULK_INDEX.Name,
    OUTDATED_DOCUMENTS_SEARCH_READ.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name]: [
    OUTDATED_DOCUMENTS_REFRESH.Name,
    CHECK_TARGET_MAPPINGS.Name,
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name,
    FATAL.Name,
  ],
  [OUTDATED_DOCUMENTS_REFRESH.Name]: [
    CHECK_TARGET_MAPPINGS.Name,
    OUTDATED_DOCUMENTS_REFRESH.Name,
    FATAL.Name,
  ],
} as const;

/** Target mappings update */
const TARGET_MAPPINGS_SUCCESSORS = {
  [CHECK_TARGET_MAPPINGS.Name]: [
    CHECK_VERSION_INDEX_READY_ACTIONS.Name,
    UPDATE_TARGET_MAPPINGS_PROPERTIES.Name,
    UPDATE_TARGET_MAPPINGS_META.Name,
    CHECK_TARGET_MAPPINGS.Name,
    FATAL.Name,
  ],
  [UPDATE_TARGET_MAPPINGS_PROPERTIES.Name]: [
    UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name,
    UPDATE_TARGET_MAPPINGS_PROPERTIES.Name,
    FATAL.Name,
  ],
  [UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name]: [
    UPDATE_TARGET_MAPPINGS_META.Name,
    UPDATE_TARGET_MAPPINGS_PROPERTIES.Name,
    UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name,
    FATAL.Name,
  ],
  [UPDATE_TARGET_MAPPINGS_META.Name]: [
    CHECK_VERSION_INDEX_READY_ACTIONS.Name,
    UPDATE_TARGET_MAPPINGS_META.Name,
    FATAL.Name,
  ],
} as const;

/** Finalization */
const FINALIZE_SUCCESSORS = {
  [WAIT_FOR_MIGRATION_COMPLETION.Name]: [WAIT_FOR_MIGRATION_COMPLETION.Name, DONE.Name, FATAL.Name],
  [CHECK_VERSION_INDEX_READY_ACTIONS.Name]: [MARK_VERSION_INDEX_READY.Name, DONE.Name, FATAL.Name],
  [MARK_VERSION_INDEX_READY.Name]: [
    DONE.Name,
    MARK_VERSION_INDEX_READY_CONFLICT.Name,
    MARK_VERSION_INDEX_READY.Name,
    FATAL.Name,
  ],
  [MARK_VERSION_INDEX_READY_CONFLICT.Name]: [
    DONE.Name,
    MARK_VERSION_INDEX_READY_CONFLICT.Name,
    FATAL.Name,
  ],
  [DONE.Name]: [],
  [FATAL.Name]: [],
} as const;

export const SUCCESSORS = {
  ...INIT_SUCCESSORS,
  ...COMPATIBLE_SUCCESSORS,
  ...CREATE_INDEX_SUCCESSORS,
  ...OUTDATED_DOCUMENTS_SUCCESSORS,
  ...TARGET_MAPPINGS_SUCCESSORS,
  ...FINALIZE_SUCCESSORS,
} as const satisfies Record<StateName, readonly StateName[]>;

export type SuccessorsOf<TName extends StateName> = (typeof SUCCESSORS)[TName][number];

/**
 * Dispatch table: state name → step factory. The loop driver in `./next`
 * reads from here instead of switching on `state.name`.
 *
 * `satisfies Record<NonTerminalState['name'], …>` forces a row per non-terminal
 * state; adding a new non-terminal state to the union without wiring up its
 * `step` factory here will not compile. Terminal states (DONE, FATAL) do not
 * export a `step` and so cannot accidentally be listed.
 */
/**
 * Per-control-point invariant checks. Dispatched from `assertInvariants` in
 * `invariants.ts` after cross-cutting base / migration-base / post-init checks.
 *
 * Only states with step-specific runtime refinements appear here; others rely
 * on centralized helpers alone.
 */
// Sparse over StateName (only states with step-specific runtime refinements).
// Annotation (not `satisfies`) is intentional: it widens the inferred type so
// the dispatcher in `invariants.ts` can index by `state.name: StateName` and
// receive `((state) => void) | undefined`. `satisfies` alone would narrow the
// type to just the listed keys, breaking dispatch. The annotation still catches
// key typos via structural assignability against `StateName`.
export const STATE_INVARIANTS: Partial<{
  [K in StateName]: (state: StateOf<K>) => void;
}> = {
  [FATAL.Name]: FATAL.assertInvariants,
  [WAIT_FOR_MIGRATION_COMPLETION.Name]: WAIT_FOR_MIGRATION_COMPLETION.assertInvariants,
  [CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name]:
    CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.assertInvariants,
  [UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name]:
    UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.assertInvariants,
  [OUTDATED_DOCUMENTS_SEARCH_READ.Name]: OUTDATED_DOCUMENTS_SEARCH_READ.assertInvariants,
  [OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name]: OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.assertInvariants,
  [OUTDATED_DOCUMENTS_TRANSFORM.Name]: OUTDATED_DOCUMENTS_TRANSFORM.assertInvariants,
  [TRANSFORMED_DOCUMENTS_BULK_INDEX.Name]: TRANSFORMED_DOCUMENTS_BULK_INDEX.assertInvariants,
  [PREPARE_COMPATIBLE_MIGRATION.Name]: PREPARE_COMPATIBLE_MIGRATION.assertInvariants,
  [MARK_VERSION_INDEX_READY.Name]: MARK_VERSION_INDEX_READY.assertInvariants,
};

export const STEPS = {
  [INIT.Name]: INIT.step,
  [WAIT_FOR_MIGRATION_COMPLETION.Name]: WAIT_FOR_MIGRATION_COMPLETION.step,
  [WAIT_FOR_YELLOW_SOURCE.Name]: WAIT_FOR_YELLOW_SOURCE.step,
  [UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name]: UPDATE_SOURCE_MAPPINGS_PROPERTIES.step,
  [COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name]:
    COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.step,
  [CLEANUP_UNKNOWN_AND_EXCLUDED.Name]: CLEANUP_UNKNOWN_AND_EXCLUDED.step,
  [CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name]:
    CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.step,
  [PREPARE_COMPATIBLE_MIGRATION.Name]: PREPARE_COMPATIBLE_MIGRATION.step,
  [REFRESH_SOURCE.Name]: REFRESH_SOURCE.step,
  [CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name]:
    CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.step,
  [CREATE_NEW_TARGET.Name]: CREATE_NEW_TARGET.step,
  [CHECK_TARGET_MAPPINGS.Name]: CHECK_TARGET_MAPPINGS.step,
  [UPDATE_TARGET_MAPPINGS_PROPERTIES.Name]: UPDATE_TARGET_MAPPINGS_PROPERTIES.step,
  [UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name]:
    UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.step,
  [UPDATE_TARGET_MAPPINGS_META.Name]: UPDATE_TARGET_MAPPINGS_META.step,
  [CHECK_VERSION_INDEX_READY_ACTIONS.Name]: CHECK_VERSION_INDEX_READY_ACTIONS.step,
  [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name]: OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.step,
  [OUTDATED_DOCUMENTS_SEARCH_READ.Name]: OUTDATED_DOCUMENTS_SEARCH_READ.step,
  [OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name]: OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.step,
  [OUTDATED_DOCUMENTS_REFRESH.Name]: OUTDATED_DOCUMENTS_REFRESH.step,
  [OUTDATED_DOCUMENTS_TRANSFORM.Name]: OUTDATED_DOCUMENTS_TRANSFORM.step,
  [TRANSFORMED_DOCUMENTS_BULK_INDEX.Name]: TRANSFORMED_DOCUMENTS_BULK_INDEX.step,
  [MARK_VERSION_INDEX_READY.Name]: MARK_VERSION_INDEX_READY.step,
  [MARK_VERSION_INDEX_READY_CONFLICT.Name]: MARK_VERSION_INDEX_READY_CONFLICT.step,
} satisfies Record<NonTerminalState['name'], unknown>;
