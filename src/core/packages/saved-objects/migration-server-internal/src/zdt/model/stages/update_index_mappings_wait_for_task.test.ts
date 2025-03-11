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
import type { ResponseType } from '../../next';
import type { UpdateIndexMappingsState } from '../../state';
import type { StateActionResponse } from '../types';
import { updateIndexMappings } from './update_index_mappings';

describe('Stage: updateIndexMappings', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<UpdateIndexMappingsState> = {}
  ): UpdateIndexMappingsState => ({
    ...createPostInitState(),
    controlState: 'UPDATE_INDEX_MAPPINGS',
    additiveMappingChanges: {},
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('UPDATE_INDEX_MAPPINGS -> UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK when successful', () => {
    const state = createState();
    const res: ResponseType<'UPDATE_INDEX_MAPPINGS'> = Either.right({
      taskId: '42',
    });

    const newState = updateIndexMappings(
      state,
      res as StateActionResponse<'UPDATE_INDEX_MAPPINGS'>,
      context
    );
    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
      updateTargetMappingsTaskId: '42',
    });
  });
});
