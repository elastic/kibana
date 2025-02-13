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
import type { UpdateMappingModelVersionState } from '../../state';
import type { StateActionResponse } from '../types';
import { updateMappingModelVersion } from './update_mapping_model_version';
import { setMetaMappingMigrationComplete } from '../../utils';

describe('Stage: updateMappingModelVersion', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<UpdateMappingModelVersionState> = {}
  ): UpdateMappingModelVersionState => ({
    ...createPostInitState(),
    controlState: 'UPDATE_MAPPING_MODEL_VERSIONS',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('updates state.currentIndexMeta', () => {
    const state = createState({});
    const res: StateActionResponse<'UPDATE_MAPPING_MODEL_VERSIONS'> = Either.right(
      'update_mappings_succeeded'
    );

    const newState = updateMappingModelVersion(state, res, context);
    expect(newState.currentIndexMeta).toEqual(
      setMetaMappingMigrationComplete({
        meta: state.currentIndexMeta,
        versions: context.typeVirtualVersions,
      })
    );
  });

  it('UPDATE_MAPPING_MODEL_VERSIONS -> UPDATE_ALIASES when at least one aliasActions', () => {
    const state = createState({
      aliasActions: [{ add: { alias: '.kibana', index: '.kibana_1' } }],
    });
    const res: StateActionResponse<'UPDATE_MAPPING_MODEL_VERSIONS'> = Either.right(
      'update_mappings_succeeded'
    );

    const newState = updateMappingModelVersion(state, res, context);
    expect(newState).toEqual({
      ...state,
      currentIndexMeta: expect.any(Object),
      controlState: 'UPDATE_ALIASES',
    });
  });

  it('UPDATE_MAPPING_MODEL_VERSIONS -> INDEX_STATE_UPDATE_DONE when no aliasActions', () => {
    const state = createState({
      aliasActions: [],
    });
    const res: StateActionResponse<'UPDATE_MAPPING_MODEL_VERSIONS'> = Either.right(
      'update_mappings_succeeded'
    );

    const newState = updateMappingModelVersion(state, res, context);
    expect(newState).toEqual({
      ...state,
      currentIndexMeta: expect.any(Object),
      controlState: 'INDEX_STATE_UPDATE_DONE',
    });
  });
});
