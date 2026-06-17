/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Runtime invariants (Lamport §5.1.1 Inv predicate).
 *
 * Cross-cutting checks (retry budget, migration config, post-init fields) live
 * here. Per-control-point checks live in `steps/*.ts` and are dispatched via
 * `STATE_INVARIANTS` in `successors.ts`.
 *
 * Cross-state properties (logs monotonicity, immutable retry budget / config,
 * successor legality) live in `successor_graph.test.ts` PBT — not duplicated here.
 *
 * Graph shape is enforced by `SUCCESSORS satisfies Record<StateName, …>` plus
 * snapshot tests in `successor_graph.test.ts`.
 */

import * as Option from 'fp-ts/Option';
import type { MigrationBaseState, PostInitState } from './migration_state';
import { assertInvariant, clause } from './invariant_helper';
import { STATE_INVARIANTS, SUCCESSORS } from './successors';
import type { State, StateName } from './state';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED from './steps/cleanup_unknown_and_excluded';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_wait_for_task';
import * as COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/compatible_update_check_cluster_routing_allocation';
import * as PREPARE_COMPATIBLE_MIGRATION from './steps/prepare_compatible_migration';
import * as REFRESH_SOURCE from './steps/refresh_source';
import * as TRANSFORMED_DOCUMENTS_BULK_INDEX from './steps/transformed_documents_bulk_index';
import * as UPDATE_SOURCE_MAPPINGS_PROPERTIES from './steps/update_source_mappings_properties';
import * as UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK from './steps/update_target_mappings_properties_wait_for_task';
import * as WAIT_FOR_YELLOW_SOURCE from './steps/wait_for_yellow_source';

export { MigrationInvariantViolation } from './invariant_helper';

/** States that poll with `delayRetryTransition(..., Number.MAX_SAFE_INTEGER, ...)`. */
const UNBOUNDED_RETRY_POLL_STATES = new Set<StateName>([
  TRANSFORMED_DOCUMENTS_BULK_INDEX.Name,
  UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name,
  CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name,
]);

/** Compatible-migration path: `sourceIndex` / `sourceIndexMappings` must be populated. */
const SOURCE_EXISTS_STATES = new Set<StateName>([
  WAIT_FOR_YELLOW_SOURCE.Name,
  UPDATE_SOURCE_MAPPINGS_PROPERTIES.Name,
  COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
  CLEANUP_UNKNOWN_AND_EXCLUDED.Name,
  CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name,
  PREPARE_COMPATIBLE_MIGRATION.Name,
  REFRESH_SOURCE.Name,
]);

const isKnownStateName = (name: string): name is StateName => name in SUCCESSORS;

// Duck-typing: uses `in` predicates rather than discriminant narrowing so that
// partial-state test fixtures (e.g. INIT stub without indexPrefix — see invariants.test.ts)
// are handled correctly without false-positive violations.
const hasMigrationBaseFields = (state: State): state is State & MigrationBaseState =>
  'indexPrefix' in state && typeof state.indexPrefix === 'string';

// Duck-typing: same rationale as hasMigrationBaseFields — handles INIT-stub and
// FATAL fixtures that lack post-init fields (see invariants.test.ts INIT stub test).
const hasPostInitFields = (state: State): state is State & PostInitState =>
  'targetIndex' in state && typeof state.targetIndex === 'string';

const assertBaseState = (state: State): void => {
  assertInvariant(isKnownStateName(state.name), `unknown state name ${state.name}`);
  assertInvariant(
    Number.isInteger(state.retryAttempts),
    clause(state.name, 'retryAttempts must be an integer')
  );
  // 0 means no retries (first retryable failure goes FATAL immediately) — operationally
  // degenerate but a valid configuration.
  assertInvariant(
    state.retryAttempts >= 0,
    clause(state.name, 'retryAttempts must be non-negative')
  );
  assertInvariant(
    Number.isInteger(state.retryCount),
    clause(state.name, 'retryCount must be an integer')
  );
  assertInvariant(state.retryCount >= 0, clause(state.name, 'retryCount must be non-negative'));
  assertInvariant(state.retryDelay >= 0, clause(state.name, 'retryDelay must be non-negative'));

  if (!UNBOUNDED_RETRY_POLL_STATES.has(state.name)) {
    assertInvariant(
      state.retryCount <= state.retryAttempts,
      clause(state.name, 'retryCount must not exceed retryAttempts')
    );
  }
};

const assertMigrationBaseFields = (state: State & MigrationBaseState): void => {
  assertInvariant(
    state.indexPrefix.length > 0,
    clause(state.name, 'indexPrefix must be non-empty')
  );
  assertInvariant(
    state.kibanaVersion.length > 0,
    clause(state.name, 'kibanaVersion must be non-empty')
  );
  assertInvariant(
    state.currentAlias.length > 0,
    clause(state.name, 'currentAlias must be non-empty')
  );
  assertInvariant(
    state.versionAlias.length > 0,
    clause(state.name, 'versionAlias must be non-empty')
  );
  assertInvariant(
    state.versionIndex.length > 0,
    clause(state.name, 'versionIndex must be non-empty')
  );
  assertInvariant(state.batchSize >= 1, clause(state.name, 'batchSize must be at least 1'));
  assertInvariant(state.maxBatchSize >= 1, clause(state.name, 'maxBatchSize must be at least 1'));
};

const assertPostInitFields = (state: State & PostInitState): void => {
  assertInvariant(
    state.targetIndex.length > 0,
    clause(state.name, 'targetIndex must be non-empty')
  );

  if (SOURCE_EXISTS_STATES.has(state.name)) {
    assertInvariant(
      Option.isSome(state.sourceIndex),
      clause(state.name, 'sourceIndex must be Some')
    );
    assertInvariant(
      Option.isSome(state.sourceIndexMappings),
      clause(state.name, 'sourceIndexMappings must be Some')
    );
    const sourceIndex = Option.getOrElse(() => '')(state.sourceIndex);
    assertInvariant(
      sourceIndex.length > 0,
      clause(state.name, 'sourceIndex value must be non-empty')
    );
  }
};

export const assertInvariants = (state: State): void => {
  assertBaseState(state);

  if (hasMigrationBaseFields(state)) {
    assertMigrationBaseFields(state);
  }

  if (hasPostInitFields(state)) {
    assertPostInitFields(state);
  }

  const perState = STATE_INVARIANTS[state.name];
  if (perState) {
    // `as never` is needed because indexed access cannot narrow `state` to the
    // dynamically-looked-up function's parameter type. Sound only because all
    // STATE_INVARIANTS values return void (enforced by the Partial<{[K]: (s) => void}> typing).
    perState(state as never);
  }
};
