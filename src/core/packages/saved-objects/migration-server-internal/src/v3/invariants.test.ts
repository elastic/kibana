/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertInvariants, assertLegalTransition, MigrationInvariantViolation } from './invariants';
import { createInitialState, type State } from './state';
import { createTestContext } from './test_helpers/context';

describe('assertInvariants', () => {
  const context = createTestContext({ migrationConfig: { retryAttempts: 3 } });
  const init = createInitialState();
  const done: State = { ...init, controlState: 'DONE', currentIndex: '.kibana_1' };

  it('accepts a valid state', () => {
    expect(() => assertInvariants(init, context)).not.toThrow();
    expect(() => assertInvariants(done, context)).not.toThrow();
  });

  it('rejects states that exceed the retry budget', () => {
    expect(() => assertInvariants({ ...init, retryCount: 4 }, context)).toThrow(
      new MigrationInvariantViolation('INIT: retryCount exceeds the retry budget')
    );
  });

  it('lets polling states poll beyond the retry budget', () => {
    const waiting: State = {
      ...init,
      controlState: 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
      currentIndex: '.kibana_1',
      previousMappings: context.indexMappings,
      updateMappings: true,
      aliasActions: [],
      convertDocuments: true,
      updateTargetMappingsTaskId: 'task',
      pollCount: 100,
    };
    expect(() => assertInvariants(waiting, context)).not.toThrow();
  });
});

describe('assertLegalTransition', () => {
  const init = createInitialState();

  it('accepts the transitions of the state graph', () => {
    expect(() =>
      assertLegalTransition(init, { ...init, controlState: 'FATAL', reason: 'boom' })
    ).not.toThrow();
  });

  it('rejects the transitions outside of the state graph', () => {
    expect(() =>
      assertLegalTransition(init, {
        ...init,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
      } as State)
    ).toThrow(
      'Invalid v3 migration state: INIT: illegal transition to OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
    );
  });
});
