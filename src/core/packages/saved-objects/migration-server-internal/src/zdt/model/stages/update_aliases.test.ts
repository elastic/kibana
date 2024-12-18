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
  createPostInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { UpdateAliasesState } from '../../state';
import type { StateActionResponse } from '../types';
import { updateAliases } from './update_aliases';

describe('Stage: updateAliases', () => {
  let context: MockedMigratorContext;

  const createState = (parts: Partial<UpdateAliasesState> = {}): UpdateAliasesState => ({
    ...createPostInitState(),
    controlState: 'UPDATE_ALIASES',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('UPDATE_ALIASES -> FATAL in case of alias_not_found_exception', () => {
    const state = createState();
    const res: StateActionResponse<'UPDATE_ALIASES'> = Either.left({
      type: 'alias_not_found_exception',
    });

    const newState = updateAliases(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: `Alias missing during alias update`,
    });
  });

  it('UPDATE_ALIASES -> FATAL in case of index_not_found_exception', () => {
    const state = createState();
    const res: StateActionResponse<'UPDATE_ALIASES'> = Either.left({
      type: 'index_not_found_exception',
      index: '.test',
    });

    const newState = updateAliases(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: `Index .test missing during alias update`,
    });
  });

  it('UPDATE_ALIASES -> INDEX_STATE_UPDATE_DONE if successful', () => {
    const state = createState();
    const res: StateActionResponse<'UPDATE_ALIASES'> = Either.right('update_aliases_succeeded');

    const newState = updateAliases(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'INDEX_STATE_UPDATE_DONE',
    });
  });
});
