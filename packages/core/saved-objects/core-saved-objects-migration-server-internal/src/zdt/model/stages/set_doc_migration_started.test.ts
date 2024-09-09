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
import type { SetDocMigrationStartedState } from '../../state';
import type { StateActionResponse } from '../types';
import { setDocMigrationStarted } from './set_doc_migration_started';

describe('Stage: setDocMigrationStarted', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<SetDocMigrationStartedState> = {}
  ): SetDocMigrationStartedState => ({
    ...createPostDocInitState(),
    controlState: 'SET_DOC_MIGRATION_STARTED',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('SET_DOC_MIGRATION_STARTED -> SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES when successful', () => {
    const state = createState();
    const res: StateActionResponse<'SET_DOC_MIGRATION_STARTED'> = Either.right(
      'update_mappings_succeeded' as const
    );

    const newState = setDocMigrationStarted(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES',
      currentIndexMeta: {
        ...state.currentIndexMeta,
        migrationState: {
          ...state.currentIndexMeta.migrationState,
          convertingDocuments: true,
        },
      },
    });
  });
});
