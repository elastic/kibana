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
import type { IndexStateUpdateDoneState } from '../../state';
import type { StateActionResponse } from '../types';
import { indexStateUpdateDone } from './index_state_update_done';

describe('Stage: indexStateUpdateDone', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<IndexStateUpdateDoneState> = {}
  ): IndexStateUpdateDoneState => ({
    ...createPostDocInitState(),
    controlState: 'INDEX_STATE_UPDATE_DONE',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT when successful and skipDocumentMigration is false', () => {
    const state = createState({
      skipDocumentMigration: false,
    });
    const res = Either.right('noop') as StateActionResponse<'INDEX_STATE_UPDATE_DONE'>;

    const newState = indexStateUpdateDone(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'DOCUMENTS_UPDATE_INIT',
    });
  });

  it('INDEX_STATE_UPDATE_DONE -> DONE when successful and skipDocumentMigration is true', () => {
    const state = createState({
      skipDocumentMigration: true,
    });
    const res = Either.right('noop') as StateActionResponse<'INDEX_STATE_UPDATE_DONE'>;

    const newState = indexStateUpdateDone(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'DONE',
    });
  });
});
