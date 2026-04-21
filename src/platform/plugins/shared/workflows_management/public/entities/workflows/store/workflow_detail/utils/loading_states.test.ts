/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
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
    it('should add pending, fulfilled, and rejected cases to the builder', () => {
      const mockBuilder = {
        addCase: jest.fn().mockReturnThis(),
      } as unknown as ActionReducerMapBuilder<WorkflowDetailState>;

      addLoadingStateReducers(mockBuilder);

      // For each thunk in the map (currently only saveYamlThunk), 3 addCase calls:
      // pending, fulfilled, rejected
      expect(mockBuilder.addCase).toHaveBeenCalledTimes(3);
    });

    it('should call pending handler that sets loading to true', () => {
      const handlers: Record<string, (state: WorkflowDetailState) => void> = {};
      const mockBuilder = {
        addCase: jest.fn(
          (actionCreator: { type: string }, handler: (state: WorkflowDetailState) => void) => {
            handlers[actionCreator.type] = handler;
            return mockBuilder;
          }
        ),
      } as unknown as ActionReducerMapBuilder<WorkflowDetailState>;

      addLoadingStateReducers(mockBuilder);

      // Find the pending handler (type ends with /pending)
      const pendingKey = Object.keys(handlers).find((key) => key.endsWith('/pending'));
      expect(pendingKey).toBeDefined();

      const state = { loading: { isSavingYaml: false } } as WorkflowDetailState;
      handlers[pendingKey!](state);
      expect(state.loading.isSavingYaml).toBe(true);
    });

    it('should call fulfilled handler that sets loading to false', () => {
      const handlers: Record<string, (state: WorkflowDetailState) => void> = {};
      const mockBuilder = {
        addCase: jest.fn(
          (actionCreator: { type: string }, handler: (state: WorkflowDetailState) => void) => {
            handlers[actionCreator.type] = handler;
            return mockBuilder;
          }
        ),
      } as unknown as ActionReducerMapBuilder<WorkflowDetailState>;

      addLoadingStateReducers(mockBuilder);

      const fulfilledKey = Object.keys(handlers).find((key) => key.endsWith('/fulfilled'));
      expect(fulfilledKey).toBeDefined();

      const state = { loading: { isSavingYaml: true } } as WorkflowDetailState;
      handlers[fulfilledKey!](state);
      expect(state.loading.isSavingYaml).toBe(false);
    });

    it('should call rejected handler that sets loading to false', () => {
      const handlers: Record<string, (state: WorkflowDetailState) => void> = {};
      const mockBuilder = {
        addCase: jest.fn(
          (actionCreator: { type: string }, handler: (state: WorkflowDetailState) => void) => {
            handlers[actionCreator.type] = handler;
            return mockBuilder;
          }
        ),
      } as unknown as ActionReducerMapBuilder<WorkflowDetailState>;

      addLoadingStateReducers(mockBuilder);

      const rejectedKey = Object.keys(handlers).find((key) => key.endsWith('/rejected'));
      expect(rejectedKey).toBeDefined();

      const state = { loading: { isSavingYaml: true } } as WorkflowDetailState;
      handlers[rejectedKey!](state);
      expect(state.loading.isSavingYaml).toBe(false);
    });
  });
});
