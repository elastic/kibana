/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import {
  createContextMock,
  createPostDocInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { SetDocMigrationStartedWaitForInstancesState } from '../../state';
import type { StateActionResponse } from '../types';
import { setDocMigrationStartedWaitForInstances } from './set_doc_migration_started_wait_for_instances';

describe('Stage: setDocMigrationStartedWaitForInstances', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<SetDocMigrationStartedWaitForInstancesState> = {}
  ): SetDocMigrationStartedWaitForInstancesState => ({
    ...createPostDocInitState(),
    controlState: 'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS when successful', () => {
    const state = createState();
    const res = Either.right(
      'wait_succeeded' as const
    ) as StateActionResponse<'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES'>;

    const newState = setDocMigrationStartedWaitForInstances(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS',
    });
  });
});
