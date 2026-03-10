/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeStateManager } from './state_manager';
import type { StateComparators, WithAllKeys } from './types';

describe('initializeStateManager', () => {
  interface TestState {
    title: string;
    count: number;
    enabled?: boolean;
    snake_case_key: string;
  }

  const defaultState: WithAllKeys<TestState> = {
    title: 'default title',
    count: 0,
    enabled: undefined,
    snake_case_key: 'default snake',
  };

  it('should initialize with default state', () => {
    const stateManager = initializeStateManager<TestState>({}, defaultState);
    expect(stateManager.getLatestState()).toEqual(defaultState);
  });

  it('should initialize with partial initial state', () => {
    const initialState: Partial<TestState> = { title: 'custom title', count: 5 };
    const stateManager = initializeStateManager<TestState>(initialState, defaultState);
    expect(stateManager.getLatestState()).toEqual({ ...defaultState, ...initialState });
  });

  it('should serialize the latest state', () => {
    const stateManager = initializeStateManager<TestState>({}, defaultState);

    stateManager.api.setTitle('updated title');
    stateManager.api.setCount(10);
    stateManager.api.setEnabled(true);

    const state = stateManager.getLatestState();
    expect(state.title).toBe('updated title');
    expect(state.count).toBe(10);
    expect(state.enabled).toBe(true);
  });

  it('should create camelCase setters and subjects for snake_cases state keys', () => {
    const stateManager = initializeStateManager<TestState>({}, defaultState);
    expect(stateManager.api.setSnakeCaseKey).toBeDefined();
    expect(stateManager.api.snakeCaseKey$).toBeDefined();
    expect(
      // eslint-disable-next-line @typescript-eslint/naming-convention
      (stateManager.api as unknown as { setSnake_case_key: unknown }).setSnake_case_key
    ).not.toBeDefined();
    expect(
      (stateManager.api as unknown as { snake_case_key$: unknown }).snake_case_key$
    ).not.toBeDefined();
  });

  it('should preserve camelCase setters and subjects for camelCase keys', () => {
    interface CamelState {
      camelCaseKey: string;
    }

    const camelDefault: WithAllKeys<CamelState> = { camelCaseKey: 'default' };
    const stateManager = initializeStateManager<CamelState>({}, camelDefault);

    expect(stateManager.api.setCamelCaseKey).toBeDefined();
    expect(stateManager.api.camelCaseKey$).toBeDefined();

    stateManager.api.setCamelCaseKey('updated');
    expect(stateManager.getLatestState().camelCaseKey).toBe('updated');
  });

  it('should update a state subject when using a setter', (done) => {
    const stateManager = initializeStateManager<TestState>({}, defaultState);
    stateManager.api.title$.subscribe((value) => {
      if (value === 'new title') {
        done();
      }
    });
    stateManager.api.setTitle('new title');
  });

  it('should update a state subject when using a case-converted setter', (done) => {
    const stateManager = initializeStateManager<TestState>({}, defaultState);
    stateManager.api.snakeCaseKey$.subscribe((value) => {
      if (value === 'updated snake') {
        expect(stateManager.getLatestState().snake_case_key).toBe('updated snake');
        done();
      }
    });
    stateManager.api.setSnakeCaseKey('updated snake');
  });

  it('should emit anyStateChange$ when any state changes', (done) => {
    const stateManager = initializeStateManager<TestState>({}, defaultState);
    let emitCount = 0;
    stateManager.anyStateChange$.subscribe(() => {
      emitCount++;
      if (emitCount === 2) {
        done();
      }
    });
    stateManager.api.setTitle('new title');
    stateManager.api.setCount(5);
  });

  it('should reinitialize all state when no comparators provided', () => {
    const stateManager = initializeStateManager<TestState>(
      { title: 'initial', count: 5 },
      defaultState
    );

    stateManager.api.setTitle('changed title');
    stateManager.api.setCount(10);

    stateManager.reinitializeState({ title: 'reset title' });

    const state = stateManager.getLatestState();
    expect(state.title).toBe('reset title');
    expect(state.count).toBe(0); // reset to default
  });

  it('should reset to default values when reinitializing with partial state', () => {
    const stateManager = initializeStateManager<TestState>(
      { title: 'initial', count: 5 },
      defaultState
    );
    stateManager.reinitializeState({ count: 15 });
    const state = stateManager.getLatestState();
    expect(state.title).toBe('default title');
    expect(state.count).toBe(15);
  });

  describe('with comparators', () => {
    const comparators: StateComparators<TestState> = {
      title: (a, b) => a === b,
      count: (a, b) => a === b,
      enabled: (a, b) => a === b,
      snake_case_key: (a, b) => a === b,
    };

    it('should not emit when value has not changed', () => {
      const stateManager = initializeStateManager<TestState>({}, defaultState, comparators);
      let emitCount = 0;
      stateManager.api.title$.subscribe(() => {
        emitCount++;
      });
      stateManager.api.setTitle('default title'); // same as default
      stateManager.api.setTitle('default title'); // same again
      expect(emitCount).toBe(1); // only initial value
    });

    it('should emit when value changes', (done) => {
      const stateManager = initializeStateManager<TestState>({}, defaultState, comparators);
      let emitCount = 0;
      stateManager.api.count$.subscribe((value) => {
        emitCount++;
        if (emitCount === 2 && value === 5) {
          done();
        }
      });
      stateManager.api.setCount(5);
    });

    it('should only reset changed keys on reinitialize', () => {
      const stateManager = initializeStateManager<TestState>(
        { title: 'initial', count: 5 },
        defaultState,
        comparators
      );
      stateManager.api.setTitle('changed title');
      stateManager.api.setCount(10);
      stateManager.reinitializeState({ title: 'changed title', count: 15 });

      const state = stateManager.getLatestState();
      expect(state.title).toBe('changed title'); // unchanged, not reset
      expect(state.count).toBe(15); // changed, reset
    });
  });
});
