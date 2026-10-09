/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Action, ActionReducerMapBuilder } from 'redux-toolkit-v1';
import { addLoadingStateReducers, initialLoadingState } from './loading_states';
import type { WorkflowDetailState } from '../types';

// Mock transitive dependencies required by saveYamlThunk -> slice -> schema/trigger_schemas
jest.mock('../../../../../../common/schema', () => ({
  getWorkflowZodSchema: jest.fn(() => ({})),
}));
jest.mock('../../../../../trigger_schemas', () => ({
  triggerSchemas: { getRegisteredIds: jest.fn(() => []) },
}));
jest.mock('../../../../../shared/lib/query_client', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

type MatcherEntry = [
  (action: Action) => boolean,
  (state: WorkflowDetailState, action: Action) => void
];

interface MockBuilder {
  addMatcher: jest.Mock<MockBuilder, [MatcherEntry[0], MatcherEntry[1]]>;
}

const createMockBuilder = () => {
  const matchers: MatcherEntry[] = [];
  const builder: MockBuilder = {
    addMatcher: jest.fn((predicate: MatcherEntry[0], reducer: MatcherEntry[1]) => {
      matchers.push([predicate, reducer]);
      return builder;
    }),
  };
  return {
    builder: builder as unknown as ActionReducerMapBuilder<WorkflowDetailState>,
    addMatcher: builder.addMatcher,
    dispatch: (type: string, state: WorkflowDetailState) => {
      const action = { type } as Action;
      matchers.forEach(([predicate, reducer]) => {
        if (predicate(action)) {
          reducer(state, action);
        }
      });
    },
  };
};

describe('loading_states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialLoadingState', () => {
    it('should have isSavingYaml set to false', () => {
      expect(initialLoadingState.isSavingYaml).toBe(false);
    });

    it('should only contain boolean false values', () => {
      const entries = Object.entries(initialLoadingState);
      expect(entries.length).toBeGreaterThan(0);
      entries.forEach(([, value]) => {
        expect(value).toBe(false);
      });
    });
  });

  describe('addLoadingStateReducers', () => {
    it('should register a matcher for each loading state (pending + settled)', () => {
      const { builder, addMatcher } = createMockBuilder();

      addLoadingStateReducers(builder);

      // For each thunk in the map (currently only saveYamlThunk), 2 addMatcher calls:
      // one for pending, one for fulfilled|rejected
      expect(addMatcher).toHaveBeenCalledTimes(2);
    });

    it('sets isSavingYaml to true on saveYamlThunk/pending', () => {
      const { builder, dispatch } = createMockBuilder();
      addLoadingStateReducers(builder);

      const state = { loading: { isSavingYaml: false } } as WorkflowDetailState;
      dispatch('detail/saveYamlThunk/pending', state);
      expect(state.loading.isSavingYaml).toBe(true);
    });

    it('sets isSavingYaml to false on saveYamlThunk/fulfilled', () => {
      const { builder, dispatch } = createMockBuilder();
      addLoadingStateReducers(builder);

      const state = { loading: { isSavingYaml: true } } as WorkflowDetailState;
      dispatch('detail/saveYamlThunk/fulfilled', state);
      expect(state.loading.isSavingYaml).toBe(false);
    });

    it('sets isSavingYaml to false on saveYamlThunk/rejected', () => {
      const { builder, dispatch } = createMockBuilder();
      addLoadingStateReducers(builder);

      const state = { loading: { isSavingYaml: true } } as WorkflowDetailState;
      dispatch('detail/saveYamlThunk/rejected', state);
      expect(state.loading.isSavingYaml).toBe(false);
    });

    it('ignores unrelated action types', () => {
      const { builder, dispatch } = createMockBuilder();
      addLoadingStateReducers(builder);

      const state = { loading: { isSavingYaml: false } } as WorkflowDetailState;
      dispatch('some/other/action', state);
      expect(state.loading.isSavingYaml).toBe(false);
    });
  });
});
