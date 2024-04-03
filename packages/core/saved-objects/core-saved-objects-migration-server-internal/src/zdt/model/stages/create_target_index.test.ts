/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import {
  createContextMock,
  createPostInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { CreateTargetIndexState } from '../../state';
import type { StateActionResponse } from '../types';
import { createTargetIndex } from './create_target_index';

describe('Stage: createTargetIndex', () => {
  let context: MockedMigratorContext;

  const createState = (parts: Partial<CreateTargetIndexState> = {}): CreateTargetIndexState => ({
    ...createPostInitState(),
    controlState: 'CREATE_TARGET_INDEX',
    indexMappings: { properties: { foo: { type: 'text' } }, _meta: {} },
    creationAliases: [],
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  describe('In case of left return', () => {
    it('CREATE_TARGET_INDEX -> CREATE_TARGET_INDEX in case of index_not_green_timeout exception', () => {
      const state = createState();
      const res: StateActionResponse<'CREATE_TARGET_INDEX'> = Either.left({
        type: 'index_not_green_timeout',
        message: 'index not green',
      });

      const result = createTargetIndex(state, res, context);

      expect(result).toEqual({
        ...state,
        controlState: 'CREATE_TARGET_INDEX',
        retryCount: 1,
        retryDelay: 2000,
        logs: expect.any(Array),
      });
    });

    it('CREATE_TARGET_INDEX -> FATAL in case of cluster_shard_limit_exceeded exception', () => {
      const state = createState();
      const res: StateActionResponse<'CREATE_TARGET_INDEX'> = Either.left({
        type: 'cluster_shard_limit_exceeded',
      });

      const result = createTargetIndex(state, res, context);

      expect(result).toEqual({
        ...state,
        controlState: 'FATAL',
        reason: expect.stringContaining('[cluster_shard_limit_exceeded]'),
      });
    });
  });

  describe('In case of right return', () => {
    it('CREATE_TARGET_INDEX -> INDEX_STATE_UPDATE_DONE when successful', () => {
      const state = createState({});
      const res: StateActionResponse<'CREATE_TARGET_INDEX'> =
        Either.right('create_index_succeeded');

      const newState = createTargetIndex(state, res, context);

      expect(newState).toEqual({
        ...state,
        controlState: 'INDEX_STATE_UPDATE_DONE',
        previousMappings: state.indexMappings,
        currentIndexMeta: state.indexMappings._meta,
        aliases: [],
        aliasActions: [],
        skipDocumentMigration: true,
      });
    });
  });
});
