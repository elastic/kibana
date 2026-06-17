/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import type { AliasAction } from '../actions';
import { assertInvariants } from './invariants';
import type { State } from './state';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_wait_for_task';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
import * as INIT from './steps/init';
import * as MARK_VERSION_INDEX_READY from './steps/mark_version_index_ready';
import * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from './steps/outdated_documents_search_close_pit';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './steps/outdated_documents_search_read';
import * as OUTDATED_DOCUMENTS_TRANSFORM from './steps/outdated_documents_transform';
import * as PREPARE_COMPATIBLE_MIGRATION from './steps/prepare_compatible_migration';
import * as REFRESH_SOURCE from './steps/refresh_source';
import * as TRANSFORMED_DOCUMENTS_BULK_INDEX from './steps/transformed_documents_bulk_index';
import * as UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK from './steps/update_target_mappings_properties_wait_for_task';
import * as WAIT_FOR_MIGRATION_COMPLETION from './steps/wait_for_migration_completion';
import * as WAIT_FOR_YELLOW_SOURCE from './steps/wait_for_yellow_source';
import {
  bulkOperationBatchesFixture,
  makeSourceExistsState,
  makeState,
  sampleRawDoc,
} from './test_helpers';
import { createInitialProgress } from '../model/progress';

const expectInvariantViolation = (fn: () => void, fragment: string): void => {
  expect(fn).toThrow(new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
};

describe('v3 migration base invariants', () => {
  it('accepts a minimal valid INIT state', () => {
    expect(() => assertInvariants(makeState(INIT.Name))).not.toThrow();
  });

  it('rejects retryCount above retryAttempts', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(DONE.Name, { retryCount: 16 })),
      'retryCount must not exceed retryAttempts'
    );
  });

  it('allows retryCount above retryAttempts in unbounded poll states', () => {
    expect(() =>
      assertInvariants(
        makeState(UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name, {
          retryCount: 100,
          retryAttempts: 15,
          updateTargetMappingsTaskId: 'task-1',
          updatedTypesQuery: Option.none,
        })
      )
    ).not.toThrow();
  });

  it('rejects non-integer retryAttempts', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(INIT.Name, { retryAttempts: 1.5 })),
      'retryAttempts must be an integer'
    );
  });

  it('rejects retryAttempts below 0', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(INIT.Name, { retryAttempts: -1 })),
      'retryAttempts must be non-negative'
    );
  });

  it('rejects negative retryDelay', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(INIT.Name, { retryDelay: -1 })),
      'retryDelay must be non-negative'
    );
  });

  it('rejects empty indexPrefix when migration base fields are present', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(INIT.Name, { indexPrefix: '' })),
      'indexPrefix must be non-empty'
    );
  });

  it('rejects empty kibanaVersion when migration base fields are present', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(INIT.Name, { kibanaVersion: '' })),
      'kibanaVersion must be non-empty'
    );
  });

  it('rejects empty targetIndex on post-init states', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(DONE.Name, { targetIndex: '' })),
      'targetIndex must be non-empty'
    );
  });
});

describe('v3 migration source-exists invariants', () => {
  it('accepts WAIT_FOR_YELLOW_SOURCE with Some sourceIndex', () => {
    expect(() =>
      assertInvariants(makeSourceExistsState(WAIT_FOR_YELLOW_SOURCE.Name))
    ).not.toThrow();
  });

  it('rejects WAIT_FOR_YELLOW_SOURCE when sourceIndex is None', () => {
    expectInvariantViolation(
      () =>
        assertInvariants({
          ...makeSourceExistsState(WAIT_FOR_YELLOW_SOURCE.Name),
          sourceIndex: Option.none,
          sourceIndexMappings: Option.none,
        } as State),
      'sourceIndex must be Some'
    );
  });

  it('rejects REFRESH_SOURCE when sourceIndex value is empty', () => {
    expectInvariantViolation(
      () =>
        assertInvariants({
          ...makeSourceExistsState(REFRESH_SOURCE.Name),
          sourceIndex: Option.some('') as Option.Some<string>,
        } as State),
      'sourceIndex value must be non-empty'
    );
  });
});

describe('v3 migration per-state invariants', () => {
  it('rejects FATAL without a reason', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(FATAL.Name, { reason: '' })),
      'FATAL: requires reason'
    );
  });

  it('accepts FATAL with a reason', () => {
    expect(() => assertInvariants(makeState(FATAL.Name, { reason: 'boom' }))).not.toThrow();
  });

  it('rejects WAIT_FOR_MIGRATION_COMPLETION with zero retryDelay', () => {
    expectInvariantViolation(
      () => assertInvariants(makeState(WAIT_FOR_MIGRATION_COMPLETION.Name, { retryDelay: 0 })),
      'retryDelay must be positive while waiting'
    );
  });

  it('accepts WAIT_FOR_MIGRATION_COMPLETION with positive retryDelay', () => {
    expect(() =>
      assertInvariants(makeState(WAIT_FOR_MIGRATION_COMPLETION.Name, { retryDelay: 2000 }))
    ).not.toThrow();
  });

  it('rejects OUTDATED_DOCUMENTS_SEARCH_READ without pitId', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(OUTDATED_DOCUMENTS_SEARCH_READ.Name, {
            pitId: '',
            lastHitSortValue: undefined,
            hasTransformedDocs: false,
            corruptDocumentIds: [],
            transformErrors: [],
            progress: createInitialProgress(),
          })
        ),
      'pitId required'
    );
  });

  it('accepts OUTDATED_DOCUMENTS_SEARCH_READ with pitId', () => {
    expect(() =>
      assertInvariants(
        makeState(OUTDATED_DOCUMENTS_SEARCH_READ.Name, {
          pitId: 'pit-abc',
          lastHitSortValue: undefined,
          hasTransformedDocs: false,
          corruptDocumentIds: [],
          transformErrors: [],
          progress: createInitialProgress(),
        })
      )
    ).not.toThrow();
  });

  it('rejects OUTDATED_DOCUMENTS_SEARCH_READ when processed exceeds total', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(OUTDATED_DOCUMENTS_SEARCH_READ.Name, {
            pitId: 'pit-abc',
            lastHitSortValue: undefined,
            hasTransformedDocs: false,
            corruptDocumentIds: [],
            transformErrors: [],
            progress: { processed: 11, total: 10 },
          })
        ),
      'progress.processed must not exceed progress.total'
    );
  });

  it('rejects OUTDATED_DOCUMENTS_TRANSFORM with empty outdatedDocuments', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(OUTDATED_DOCUMENTS_TRANSFORM.Name, {
            pitId: 'pit-abc',
            outdatedDocuments: [],
            lastHitSortValue: undefined,
            hasTransformedDocs: false,
            corruptDocumentIds: [],
            transformErrors: [],
            progress: createInitialProgress(),
          })
        ),
      'outdatedDocuments must be non-empty'
    );
  });

  it('accepts OUTDATED_DOCUMENTS_TRANSFORM with documents', () => {
    expect(() =>
      assertInvariants(
        makeState(OUTDATED_DOCUMENTS_TRANSFORM.Name, {
          pitId: 'pit-abc',
          outdatedDocuments: [sampleRawDoc],
          lastHitSortValue: undefined,
          hasTransformedDocs: false,
          corruptDocumentIds: [],
          transformErrors: [],
          progress: createInitialProgress(),
        })
      )
    ).not.toThrow();
  });

  it('rejects TRANSFORMED_DOCUMENTS_BULK_INDEX when currentBatch is out of range', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(TRANSFORMED_DOCUMENTS_BULK_INDEX.Name, {
            pitId: 'pit-abc',
            bulkOperationBatches: bulkOperationBatchesFixture(),
            currentBatch: 99,
            lastHitSortValue: undefined,
            hasTransformedDocs: true,
            progress: createInitialProgress(),
          })
        ),
      'currentBatch must index into bulkOperationBatches'
    );
  });

  it('accepts TRANSFORMED_DOCUMENTS_BULK_INDEX with valid batch index', () => {
    expect(() =>
      assertInvariants(
        makeState(TRANSFORMED_DOCUMENTS_BULK_INDEX.Name, {
          pitId: 'pit-abc',
          bulkOperationBatches: bulkOperationBatchesFixture(),
          currentBatch: 0,
          lastHitSortValue: undefined,
          hasTransformedDocs: true,
          progress: createInitialProgress(),
        })
      )
    ).not.toThrow();
  });

  it('rejects OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT without pitId', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name, {
            pitId: '',
            hasTransformedDocs: false,
          })
        ),
      'pitId required'
    );
  });

  it('rejects CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK without task id', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeSourceExistsState(CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name, {
            deleteByQueryTaskId: '',
          })
        ),
      'deleteByQueryTaskId required'
    );
  });

  it('rejects UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK without task id', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.Name, {
            updateTargetMappingsTaskId: '',
            updatedTypesQuery: Option.none,
          })
        ),
      'updateTargetMappingsTaskId required'
    );
  });

  it('rejects PREPARE_COMPATIBLE_MIGRATION without alias actions', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeSourceExistsState(PREPARE_COMPATIBLE_MIGRATION.Name, {
            preTransformDocsActions: [],
          })
        ),
      'preTransformDocsActions must be non-empty'
    );
  });

  it('rejects MARK_VERSION_INDEX_READY when versionIndexReadyActions is None', () => {
    expectInvariantViolation(
      () =>
        assertInvariants({
          ...makeState(MARK_VERSION_INDEX_READY.Name),
          versionIndexReadyActions: Option.none,
        } as State),
      'versionIndexReadyActions must be Some'
    );
  });

  it('rejects MARK_VERSION_INDEX_READY when versionIndexReadyActions is empty', () => {
    expectInvariantViolation(
      () =>
        assertInvariants({
          ...makeState(MARK_VERSION_INDEX_READY.Name),
          versionIndexReadyActions: Option.some([]) as Option.Some<AliasAction[]>,
        } as State),
      'versionIndexReadyActions must be non-empty'
    );
  });

  it('accepts MARK_VERSION_INDEX_READY with alias actions', () => {
    expect(() =>
      assertInvariants(
        makeState(MARK_VERSION_INDEX_READY.Name, {
          versionIndexReadyActions: Option.some([
            { remove: { index: '.kibana_7.11.0_001', alias: '.kibana_7.11.0' } },
          ]) as Option.Some<AliasAction[]>,
        })
      )
    ).not.toThrow();
  });
});

describe('v3 migration INIT stub compatibility', () => {
  it('accepts retry-only INIT (POC runner stub without indexPrefix)', () => {
    expect(() =>
      assertInvariants({
        name: INIT.Name,
        retryAttempts: 3,
        retryCount: 0,
        skipRetryReset: false,
        retryDelay: 0,
        logs: [],
      } as unknown as State)
    ).not.toThrow();
  });
});

describe('v3 migration isKnownStateName guard', () => {
  it('rejects a state with an unknown name', () => {
    expectInvariantViolation(
      () =>
        assertInvariants({
          name: 'NONEXISTENT_STATE',
          retryAttempts: 3,
          retryCount: 0,
          skipRetryReset: false,
          retryDelay: 0,
          logs: [],
        } as unknown as State),
      'unknown state name NONEXISTENT_STATE'
    );
  });
});

describe('v3 TRANSFORMED_DOCUMENTS_BULK_INDEX invariant clauses', () => {
  it('rejects empty pitId', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(TRANSFORMED_DOCUMENTS_BULK_INDEX.Name, {
            pitId: '',
            bulkOperationBatches: bulkOperationBatchesFixture(),
            currentBatch: 0,
            lastHitSortValue: undefined,
            hasTransformedDocs: true,
            progress: createInitialProgress(),
          })
        ),
      'pitId required'
    );
  });

  it('rejects empty bulkOperationBatches', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(TRANSFORMED_DOCUMENTS_BULK_INDEX.Name, {
            pitId: 'pit-abc',
            bulkOperationBatches: [],
            currentBatch: 0,
            lastHitSortValue: undefined,
            hasTransformedDocs: true,
            progress: createInitialProgress(),
          })
        ),
      'bulkOperationBatches must be non-empty'
    );
  });

  it('rejects negative currentBatch', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(TRANSFORMED_DOCUMENTS_BULK_INDEX.Name, {
            pitId: 'pit-abc',
            bulkOperationBatches: bulkOperationBatchesFixture(),
            currentBatch: -1,
            lastHitSortValue: undefined,
            hasTransformedDocs: true,
            progress: createInitialProgress(),
          })
        ),
      'currentBatch must be non-negative'
    );
  });

  it('rejects currentBatch beyond bulkOperationBatches length', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(TRANSFORMED_DOCUMENTS_BULK_INDEX.Name, {
            pitId: 'pit-abc',
            bulkOperationBatches: bulkOperationBatchesFixture(),
            currentBatch: 99,
            lastHitSortValue: undefined,
            hasTransformedDocs: true,
            progress: createInitialProgress(),
          })
        ),
      'currentBatch must index into bulkOperationBatches'
    );
  });

  it('rejects empty current batch', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(TRANSFORMED_DOCUMENTS_BULK_INDEX.Name, {
            pitId: 'pit-abc',
            bulkOperationBatches: [[]],
            currentBatch: 0,
            lastHitSortValue: undefined,
            hasTransformedDocs: true,
            progress: createInitialProgress(),
          })
        ),
      'current bulk batch must be non-empty'
    );
  });
});

describe('v3 OUTDATED_DOCUMENTS_TRANSFORM invariant clauses', () => {
  it('rejects empty pitId', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(OUTDATED_DOCUMENTS_TRANSFORM.Name, {
            pitId: '',
            outdatedDocuments: [sampleRawDoc],
            lastHitSortValue: undefined,
            hasTransformedDocs: false,
            corruptDocumentIds: [],
            transformErrors: [],
            progress: createInitialProgress(),
          })
        ),
      'pitId required'
    );
  });

  it('rejects empty outdatedDocuments', () => {
    expectInvariantViolation(
      () =>
        assertInvariants(
          makeState(OUTDATED_DOCUMENTS_TRANSFORM.Name, {
            pitId: 'pit-abc',
            outdatedDocuments: [],
            lastHitSortValue: undefined,
            hasTransformedDocs: false,
            corruptDocumentIds: [],
            transformErrors: [],
            progress: createInitialProgress(),
          })
        ),
      'outdatedDocuments must be non-empty'
    );
  });
});
