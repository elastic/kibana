/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Expect, Equals, Extends } from './type_test_helpers';
import type { StateName } from '../state';
import type { SuccessorsOf } from '../types';
import type { SUCCESSORS } from '../successors';
import type * as INIT from '../steps/init';
import type * as REFRESH_SOURCE from '../steps/refresh_source';
import type * as OUTDATED_DOCUMENTS_SEARCH_READ from '../steps/outdated_documents_search_read';
import type * as MARK_VERSION_INDEX_READY from '../steps/mark_version_index_ready';
import type * as DONE from '../steps/done';
import type * as FATAL from '../steps/fatal';

// C1 — SUCCESSORS has a row for every StateName
type SuccessorKeys = keyof typeof SUCCESSORS;
type C1StateNamesAreKeys = Expect<Extends<StateName, SuccessorKeys>>;
type C1KeysAreStateNames = Expect<Extends<SuccessorKeys, StateName>>;

// S6 — SuccessorsOf resolves to the SUCCESSORS row literal union
type InitSuccessorsFromTable = (typeof SUCCESSORS)[typeof INIT.Name][number];
type S6InitMatchesTable = Expect<Equals<SuccessorsOf<typeof INIT.Name>, InitSuccessorsFromTable>>;

type RefreshSourceSuccessorsFromTable = (typeof SUCCESSORS)[typeof REFRESH_SOURCE.Name][number];
type S6RefreshSourceMatchesTable = Expect<
  Equals<SuccessorsOf<typeof REFRESH_SOURCE.Name>, RefreshSourceSuccessorsFromTable>
>;

type OutdatedDocumentsSearchReadSuccessorsFromTable =
  (typeof SUCCESSORS)[typeof OUTDATED_DOCUMENTS_SEARCH_READ.Name][number];
type S6OutdatedDocumentsSearchReadMatchesTable = Expect<
  Equals<
    SuccessorsOf<typeof OUTDATED_DOCUMENTS_SEARCH_READ.Name>,
    OutdatedDocumentsSearchReadSuccessorsFromTable
  >
>;

type MarkVersionIndexReadySuccessorsFromTable =
  (typeof SUCCESSORS)[typeof MARK_VERSION_INDEX_READY.Name][number];
type S6MarkVersionIndexReadyMatchesTable = Expect<
  Equals<
    SuccessorsOf<typeof MARK_VERSION_INDEX_READY.Name>,
    MarkVersionIndexReadySuccessorsFromTable
  >
>;

type DoneSuccessorsFromTable = (typeof SUCCESSORS)[typeof DONE.Name][number];
type S6DoneMatchesTable = Expect<Equals<SuccessorsOf<typeof DONE.Name>, DoneSuccessorsFromTable>>;

type FatalSuccessorsFromTable = (typeof SUCCESSORS)[typeof FATAL.Name][number];
type S6FatalMatchesTable = Expect<
  Equals<SuccessorsOf<typeof FATAL.Name>, FatalSuccessorsFromTable>
>;

// C4 / §5.1 — SuccessorsOf preserves literal tuple precision (not widened to StateName)
type ExpectedInitSuccessors =
  | 'WAIT_FOR_MIGRATION_COMPLETION'
  | 'WAIT_FOR_YELLOW_SOURCE'
  | 'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION'
  | 'INIT'
  | 'FATAL';

type InitSuccessorsAreLiterals = Expect<
  Equals<SuccessorsOf<typeof INIT.Name>, ExpectedInitSuccessors>
>;

type ExpectedRefreshSourceSuccessors =
  | 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
  | 'REFRESH_SOURCE'
  | 'FATAL';

type RefreshSourceSuccessorsAreLiterals = Expect<
  Equals<SuccessorsOf<typeof REFRESH_SOURCE.Name>, ExpectedRefreshSourceSuccessors>
>;

type ExpectedOutdatedDocumentsSearchReadSuccessors =
  | 'OUTDATED_DOCUMENTS_TRANSFORM'
  | 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT'
  | 'OUTDATED_DOCUMENTS_SEARCH_READ'
  | 'FATAL';

type OutdatedDocumentsSearchReadSuccessorsAreLiterals = Expect<
  Equals<
    SuccessorsOf<typeof OUTDATED_DOCUMENTS_SEARCH_READ.Name>,
    ExpectedOutdatedDocumentsSearchReadSuccessors
  >
>;

type ExpectedMarkVersionIndexReadySuccessors =
  | 'DONE'
  | 'MARK_VERSION_INDEX_READY_CONFLICT'
  | 'MARK_VERSION_INDEX_READY'
  | 'FATAL';

type MarkVersionIndexReadySuccessorsAreLiterals = Expect<
  Equals<
    SuccessorsOf<typeof MARK_VERSION_INDEX_READY.Name>,
    ExpectedMarkVersionIndexReadySuccessors
  >
>;

export type V3GraphTypeTests = [
  C1StateNamesAreKeys,
  C1KeysAreStateNames,
  S6InitMatchesTable,
  S6RefreshSourceMatchesTable,
  S6OutdatedDocumentsSearchReadMatchesTable,
  S6MarkVersionIndexReadyMatchesTable,
  S6DoneMatchesTable,
  S6FatalMatchesTable,
  InitSuccessorsAreLiterals,
  RefreshSourceSuccessorsAreLiterals,
  OutdatedDocumentsSearchReadSuccessorsAreLiterals,
  MarkVersionIndexReadySuccessorsAreLiterals
];

export {};
