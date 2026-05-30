/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Expect, Equals } from './type_test_helpers';
import type {
  State,
  StateName,
  StateOf,
  NonTerminalState,
  TerminalState,
  TransitionExtras,
} from '../state';
import type { PostInitState } from '../migration_state';
import type * as INIT from '../steps/init';
import type * as WAIT_FOR_MIGRATION_COMPLETION from '../steps/wait_for_migration_completion';
import type * as WAIT_FOR_YELLOW_SOURCE from '../steps/wait_for_yellow_source';
import type * as UPDATE_SOURCE_MAPPINGS_PROPERTIES from '../steps/update_source_mappings_properties';
import type * as COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION from '../steps/compatible_update_check_cluster_routing_allocation';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED from '../steps/cleanup_unknown_and_excluded';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from '../steps/cleanup_unknown_and_excluded_wait_for_task';
import type * as PREPARE_COMPATIBLE_MIGRATION from '../steps/prepare_compatible_migration';
import type * as REFRESH_SOURCE from '../steps/refresh_source';
import type * as CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION from '../steps/create_index_check_cluster_routing_allocation';
import type * as CREATE_NEW_TARGET from '../steps/create_new_target';
import type * as CHECK_TARGET_MAPPINGS from '../steps/check_target_mappings';
import type * as UPDATE_TARGET_MAPPINGS_PROPERTIES from '../steps/update_target_mappings_properties';
import type * as UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK from '../steps/update_target_mappings_properties_wait_for_task';
import type * as UPDATE_TARGET_MAPPINGS_META from '../steps/update_target_mappings_meta';
import type * as CHECK_VERSION_INDEX_READY_ACTIONS from '../steps/check_version_index_ready_actions';
import type * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from '../steps/outdated_documents_search_open_pit';
import type * as OUTDATED_DOCUMENTS_SEARCH_READ from '../steps/outdated_documents_search_read';
import type * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from '../steps/outdated_documents_search_close_pit';
import type * as OUTDATED_DOCUMENTS_REFRESH from '../steps/outdated_documents_refresh';
import type * as OUTDATED_DOCUMENTS_TRANSFORM from '../steps/outdated_documents_transform';
import type * as TRANSFORMED_DOCUMENTS_BULK_INDEX from '../steps/transformed_documents_bulk_index';
import type * as MARK_VERSION_INDEX_READY from '../steps/mark_version_index_ready';
import type * as MARK_VERSION_INDEX_READY_CONFLICT from '../steps/mark_version_index_ready_conflict';
import type * as DONE from '../steps/done';
import type * as FATAL from '../steps/fatal';

/** Literal union of every control-point discriminant exported from steps/. */
type AllExportedNames =
  | typeof INIT.Name
  | typeof WAIT_FOR_MIGRATION_COMPLETION.Name
  | typeof WAIT_FOR_YELLOW_SOURCE.Name
  | typeof UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name
  | typeof COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name
  | typeof CLEANUP_UNKNOWN_AND_EXCLUDED.Name
  | typeof CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name
  | typeof PREPARE_COMPATIBLE_MIGRATION.Name
  | typeof REFRESH_SOURCE.Name
  | typeof CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name
  | typeof CREATE_NEW_TARGET.Name
  | typeof CHECK_TARGET_MAPPINGS.Name
  | typeof UPDATE_TARGET_MAPPINGS_PROPERTIES.Name
  | typeof UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name
  | typeof UPDATE_TARGET_MAPPINGS_META.Name
  | typeof CHECK_VERSION_INDEX_READY_ACTIONS.Name
  | typeof OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name
  | typeof OUTDATED_DOCUMENTS_SEARCH_READ.Name
  | typeof OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name
  | typeof OUTDATED_DOCUMENTS_REFRESH.Name
  | typeof OUTDATED_DOCUMENTS_TRANSFORM.Name
  | typeof TRANSFORMED_DOCUMENTS_BULK_INDEX.Name
  | typeof MARK_VERSION_INDEX_READY.Name
  | typeof MARK_VERSION_INDEX_READY_CONFLICT.Name
  | typeof DONE.Name
  | typeof FATAL.Name;

// S1 — State discriminated union keyed by name
type S1StateNamesEqualUnion = Expect<Equals<State['name'], StateName>>;

// S2 — StateName equals every step module Name export
type S2StateNameEqualsAllExports = Expect<Equals<StateName, AllExportedNames>>;

// S3 — NonTerminalState excludes terminal variants
type S3NonTerminal = Expect<Equals<NonTerminalState, Exclude<State, DONE.State | FATAL.State>>>;

// S4 — TerminalState is DONE | FATAL
type S4Terminal = Expect<Equals<TerminalState, DONE.State | FATAL.State>>;

// S5 — StateOf resolves to the matching step State type
type S5Init = Expect<Equals<StateOf<'INIT'>, INIT.State>>;
type S5RefreshSource = Expect<Equals<StateOf<'REFRESH_SOURCE'>, REFRESH_SOURCE.State>>;
type S5Done = Expect<Equals<StateOf<'DONE'>, DONE.State>>;
type S5Fatal = Expect<Equals<StateOf<'FATAL'>, FATAL.State>>;

// S7 — TransitionExtras is the field delta between from and to
type S7InitToWaitForYellow = Expect<
  Equals<
    TransitionExtras<INIT.State, 'WAIT_FOR_YELLOW_SOURCE'>,
    Omit<StateOf<'WAIT_FOR_YELLOW_SOURCE'>, keyof INIT.State | 'name'>
  >
>;
type S7PostInitToFatal = Expect<
  Equals<
    TransitionExtras<PostInitState, 'FATAL'>,
    Omit<StateOf<'FATAL'>, keyof PostInitState | 'name'>
  >
>;

// C3 — every State variant uses its module Name literal as the discriminant
type C3Init = Expect<Equals<StateOf<'INIT'>['name'], typeof INIT.Name>>;
type C3WaitForMigrationCompletion = Expect<
  Equals<
    StateOf<'WAIT_FOR_MIGRATION_COMPLETION'>['name'],
    typeof WAIT_FOR_MIGRATION_COMPLETION.Name
  >
>;
type C3WaitForYellowSource = Expect<
  Equals<StateOf<'WAIT_FOR_YELLOW_SOURCE'>['name'], typeof WAIT_FOR_YELLOW_SOURCE.Name>
>;
type C3UpdateSourceMappingsProperties = Expect<
  Equals<
    StateOf<'UPDATE_SOURCE_MAPPINGS_PROPERTIES'>['name'],
    typeof UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name
  >
>;
type C3CompatibleUpdateCheckClusterRoutingAllocation = Expect<
  Equals<
    StateOf<'COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION'>['name'],
    typeof COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name
  >
>;
type C3CleanupUnknownAndExcluded = Expect<
  Equals<StateOf<'CLEANUP_UNKNOWN_AND_EXCLUDED'>['name'], typeof CLEANUP_UNKNOWN_AND_EXCLUDED.Name>
>;
type C3CleanupUnknownAndExcludedWaitForTask = Expect<
  Equals<
    StateOf<'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK'>['name'],
    typeof CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name
  >
>;
type C3PrepareCompatibleMigration = Expect<
  Equals<StateOf<'PREPARE_COMPATIBLE_MIGRATION'>['name'], typeof PREPARE_COMPATIBLE_MIGRATION.Name>
>;
type C3RefreshSource = Expect<
  Equals<StateOf<'REFRESH_SOURCE'>['name'], typeof REFRESH_SOURCE.Name>
>;
type C3CreateIndexCheckClusterRoutingAllocation = Expect<
  Equals<
    StateOf<'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION'>['name'],
    typeof CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name
  >
>;
type C3CreateNewTarget = Expect<
  Equals<StateOf<'CREATE_NEW_TARGET'>['name'], typeof CREATE_NEW_TARGET.Name>
>;
type C3CheckTargetMappings = Expect<
  Equals<StateOf<'CHECK_TARGET_MAPPINGS'>['name'], typeof CHECK_TARGET_MAPPINGS.Name>
>;
type C3UpdateTargetMappingsProperties = Expect<
  Equals<
    StateOf<'UPDATE_TARGET_MAPPINGS_PROPERTIES'>['name'],
    typeof UPDATE_TARGET_MAPPINGS_PROPERTIES.Name
  >
>;
type C3UpdateTargetMappingsPropertiesWaitForTask = Expect<
  Equals<
    StateOf<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'>['name'],
    typeof UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name
  >
>;
type C3UpdateTargetMappingsMeta = Expect<
  Equals<StateOf<'UPDATE_TARGET_MAPPINGS_META'>['name'], typeof UPDATE_TARGET_MAPPINGS_META.Name>
>;
type C3CheckVersionIndexReadyActions = Expect<
  Equals<
    StateOf<'CHECK_VERSION_INDEX_READY_ACTIONS'>['name'],
    typeof CHECK_VERSION_INDEX_READY_ACTIONS.Name
  >
>;
type C3OutdatedDocumentsSearchOpenPit = Expect<
  Equals<
    StateOf<'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'>['name'],
    typeof OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name
  >
>;
type C3OutdatedDocumentsSearchRead = Expect<
  Equals<
    StateOf<'OUTDATED_DOCUMENTS_SEARCH_READ'>['name'],
    typeof OUTDATED_DOCUMENTS_SEARCH_READ.Name
  >
>;
type C3OutdatedDocumentsSearchClosePit = Expect<
  Equals<
    StateOf<'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT'>['name'],
    typeof OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name
  >
>;
type C3OutdatedDocumentsRefresh = Expect<
  Equals<StateOf<'OUTDATED_DOCUMENTS_REFRESH'>['name'], typeof OUTDATED_DOCUMENTS_REFRESH.Name>
>;
type C3OutdatedDocumentsTransform = Expect<
  Equals<StateOf<'OUTDATED_DOCUMENTS_TRANSFORM'>['name'], typeof OUTDATED_DOCUMENTS_TRANSFORM.Name>
>;
type C3TransformedDocumentsBulkIndex = Expect<
  Equals<
    StateOf<'TRANSFORMED_DOCUMENTS_BULK_INDEX'>['name'],
    typeof TRANSFORMED_DOCUMENTS_BULK_INDEX.Name
  >
>;
type C3MarkVersionIndexReady = Expect<
  Equals<StateOf<'MARK_VERSION_INDEX_READY'>['name'], typeof MARK_VERSION_INDEX_READY.Name>
>;
type C3MarkVersionIndexReadyConflict = Expect<
  Equals<
    StateOf<'MARK_VERSION_INDEX_READY_CONFLICT'>['name'],
    typeof MARK_VERSION_INDEX_READY_CONFLICT.Name
  >
>;
type C3Done = Expect<Equals<StateOf<'DONE'>['name'], typeof DONE.Name>>;
type C3Fatal = Expect<Equals<StateOf<'FATAL'>['name'], typeof FATAL.Name>>;

export type V3StateDerivationsTypeTests = [
  S1StateNamesEqualUnion,
  S2StateNameEqualsAllExports,
  S3NonTerminal,
  S4Terminal,
  S5Init,
  S5RefreshSource,
  S5Done,
  S5Fatal,
  S7InitToWaitForYellow,
  S7PostInitToFatal,
  C3Init,
  C3WaitForMigrationCompletion,
  C3WaitForYellowSource,
  C3UpdateSourceMappingsProperties,
  C3CompatibleUpdateCheckClusterRoutingAllocation,
  C3CleanupUnknownAndExcluded,
  C3CleanupUnknownAndExcludedWaitForTask,
  C3PrepareCompatibleMigration,
  C3RefreshSource,
  C3CreateIndexCheckClusterRoutingAllocation,
  C3CreateNewTarget,
  C3CheckTargetMappings,
  C3UpdateTargetMappingsProperties,
  C3UpdateTargetMappingsPropertiesWaitForTask,
  C3UpdateTargetMappingsMeta,
  C3CheckVersionIndexReadyActions,
  C3OutdatedDocumentsSearchOpenPit,
  C3OutdatedDocumentsSearchRead,
  C3OutdatedDocumentsSearchClosePit,
  C3OutdatedDocumentsRefresh,
  C3OutdatedDocumentsTransform,
  C3TransformedDocumentsBulkIndex,
  C3MarkVersionIndexReady,
  C3MarkVersionIndexReadyConflict,
  C3Done,
  C3Fatal
];

export {};
