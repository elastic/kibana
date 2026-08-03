/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML, { LineCounter } from 'yaml';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { HIGHLIGHTED_STEP_TRIGGER, setCursorPosition, setWorkflow, setYamlString } from './slice';
import type { ComputedData } from './types';
import {
  createStepInfo,
  createWorkflowLookup,
} from '../../../../shared/test_utils/step_info_factory';
import { createMockStore } from '../__mocks__/store.mock';
import type { MockStore } from '../__mocks__/store.mock';

// Mock the computation utility
jest.mock('./utils/computation', () => ({
  performComputation: jest.fn(),
}));

const { performComputation } = jest.requireMock('./utils/computation');

describe('workflowComputationMiddleware', () => {
  let store: MockStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore();
  });

  it('should clear computed data when yamlString is empty', () => {
    performComputation.mockReturnValue({
      yamlDocument: YAML.parseDocument('name: test'),
      yamlLineCounter: new LineCounter(),
      workflowLookup: { steps: {} },
    } satisfies ComputedData);

    // First, set some yaml to initialize computed data
    store.dispatch(setYamlString('name: test'));

    // Now clear
    store.dispatch(setYamlString(''));

    const state = store.getState();
    // computed should be cleared (set to empty object by _clearComputedData)
    expect(state.detail.computed).toEqual({});
    expect(state.detail.focusedStepId).toBeUndefined();
  });

  it('should perform immediate computation when computed is undefined', () => {
    const mockComputed: ComputedData = {
      yamlDocument: YAML.parseDocument('name: test'),
      yamlLineCounter: new LineCounter(),
      workflowLookup: { steps: {} },
    };

    performComputation.mockReturnValue(mockComputed);

    // Computed starts as undefined, so first dispatch triggers immediate computation
    store.dispatch(setYamlString('name: test'));

    expect(performComputation).toHaveBeenCalledWith('name: test', undefined);
    expect(store.getState().detail.computed).toEqual(mockComputed);
  });

  it('should debounce computation when computed already exists', () => {
    jest.useFakeTimers();

    const mockComputed: ComputedData = {
      yamlDocument: YAML.parseDocument('name: test'),
      yamlLineCounter: new LineCounter(),
      workflowLookup: { steps: {} },
    };

    performComputation.mockReturnValue(mockComputed);

    // First dispatch: immediate computation (computed is undefined)
    store.dispatch(setYamlString('name: test'));
    expect(performComputation).toHaveBeenCalledTimes(1);

    // Second dispatch: should be debounced (computed is now defined)
    performComputation.mockClear();
    store.dispatch(setYamlString('name: test2'));
    expect(performComputation).not.toHaveBeenCalled();

    // Advance timers past the debounce window (500ms)
    jest.advanceTimersByTime(500);

    expect(performComputation).toHaveBeenCalledWith('name: test2', undefined);

    jest.useRealTimers();
  });

  it('should clear computed data when performComputation throws', () => {
    const mockComputed: ComputedData = {
      yamlDocument: YAML.parseDocument('name: test'),
      yamlLineCounter: new LineCounter(),
      workflowLookup: { steps: {} },
    };

    // First call succeeds to initialize computed
    performComputation.mockReturnValueOnce(mockComputed);
    store.dispatch(setYamlString('name: test'));
    expect(store.getState().detail.computed).toEqual(mockComputed);

    // Second call throws - since computed is defined, it will be debounced
    jest.useFakeTimers();
    performComputation.mockImplementationOnce(() => {
      throw new Error('parse error');
    });

    store.dispatch(setYamlString('invalid: {{{'));

    // Advance past debounce
    jest.advanceTimersByTime(500);

    // computed should be cleared due to the error
    expect(store.getState().detail.computed).toEqual({});
    expect(store.getState().detail.focusedStepId).toBeUndefined();

    jest.useRealTimers();
  });

  describe('setWorkflow — computed reset on workflow-id change (item 2 bug fix)', () => {
    const makeWorkflow = (id: string): WorkflowDetailDto =>
      ({ id, yaml: '', definition: {} } as unknown as WorkflowDetailDto);

    it('resets computed, cursorPosition, focusedStepId when the workflow id changes', () => {
      const mockComputed: ComputedData = {
        yamlDocument: YAML.parseDocument('name: test'),
        yamlLineCounter: new LineCounter(),
        workflowLookup: { steps: {} },
      };
      performComputation.mockReturnValue(mockComputed);

      // Load workflow A — boots up computed
      store.dispatch(setWorkflow(makeWorkflow('a')));
      store.dispatch(setYamlString('name: test'));
      expect(store.getState().detail.computed).toEqual(mockComputed);

      // Navigate to workflow B — must reset computed to undefined so the
      // middleware bootstrap re-arms on the next setYamlString
      store.dispatch(setWorkflow(makeWorkflow('b')));
      const state = store.getState().detail;
      expect(state.computed).toBeUndefined();
      expect(state.cursorPosition).toBeUndefined();
      expect(state.focusedStepId).toBeUndefined();
    });

    it('does NOT reset computed when re-dispatching the same workflow id (e.g. after save)', () => {
      const mockComputed: ComputedData = {
        yamlDocument: YAML.parseDocument('name: test'),
        yamlLineCounter: new LineCounter(),
        workflowLookup: { steps: {} },
      };
      performComputation.mockReturnValue(mockComputed);

      store.dispatch(setWorkflow(makeWorkflow('a')));
      store.dispatch(setYamlString('name: test'));
      expect(store.getState().detail.computed).toEqual(mockComputed);

      // Same id — must not wipe computed (save_yaml_thunk dispatches setWorkflow with the same id)
      store.dispatch(setWorkflow(makeWorkflow('a')));
      expect(store.getState().detail.computed).toEqual(mockComputed);
    });

    it('re-arms the synchronous bootstrap after a workflow-id change', () => {
      const computedA: ComputedData = {
        yamlDocument: YAML.parseDocument('name: a'),
        yamlLineCounter: new LineCounter(),
        workflowLookup: { steps: {} },
      };
      const computedB: ComputedData = {
        yamlDocument: YAML.parseDocument('name: b'),
        yamlLineCounter: new LineCounter(),
        workflowLookup: { steps: {} },
      };
      performComputation.mockReturnValueOnce(computedA).mockReturnValueOnce(computedB);

      // Load workflow A (synchronous bootstrap)
      store.dispatch(setWorkflow(makeWorkflow('a')));
      store.dispatch(setYamlString('name: a'));
      expect(performComputation).toHaveBeenCalledTimes(1);
      performComputation.mockClear();

      // Switch to workflow B — resets computed; next setYamlString must run the bootstrap
      // synchronously (not the 500ms-debounced path)
      store.dispatch(setWorkflow(makeWorkflow('b')));
      store.dispatch(setYamlString('name: b'));

      // performComputation called immediately (bootstrap), not after a timer
      expect(performComputation).toHaveBeenCalledTimes(1);
      expect(store.getState().detail.computed).toEqual(computedB);
    });
  });

  describe('focusedTriggerId — at-most-one invariant with focusedStepId (item 7)', () => {
    const triggerStep = createStepInfo({ stepId: 'step-1', lineStart: 10, lineEnd: 20 });
    const lookup = createWorkflowLookup([triggerStep], { triggersLineStart: 3 });
    const mockComputed: ComputedData = {
      yamlDocument: YAML.parseDocument('name: test'),
      yamlLineCounter: new LineCounter(),
      workflowLookup: lookup,
    };

    beforeEach(() => {
      performComputation.mockReturnValue(mockComputed);
      store.dispatch(setYamlString('name: test'));
    });

    it('sets focusedTriggerId and clears focusedStepId when cursor is in the triggers block', () => {
      store.dispatch(setCursorPosition({ lineNumber: 5, column: 1 }));
      const state = store.getState().detail;
      expect(state.focusedTriggerId).toBe(HIGHLIGHTED_STEP_TRIGGER);
      expect(state.focusedStepId).toBeUndefined();
    });

    it('sets focusedStepId and clears focusedTriggerId when cursor is on a step', () => {
      store.dispatch(setCursorPosition({ lineNumber: 15, column: 1 }));
      const state = store.getState().detail;
      expect(state.focusedStepId).toBe('step-1');
      expect(state.focusedTriggerId).toBeUndefined();
    });

    it('clears both when cursor is before the triggers block (outside any known region)', () => {
      // first land in triggers (triggersLineStart=3)
      store.dispatch(setCursorPosition({ lineNumber: 5, column: 1 }));
      expect(store.getState().detail.focusedTriggerId).toBe(HIGHLIGHTED_STEP_TRIGGER);

      // move to line 1 — before triggersLineStart=3, no step covers it
      store.dispatch(setCursorPosition({ lineNumber: 1, column: 1 }));
      const state = store.getState().detail;
      expect(state.focusedStepId).toBeUndefined();
      expect(state.focusedTriggerId).toBeUndefined();
    });
  });

  it('should cancel pending debounced computation when a new yamlString is dispatched', () => {
    jest.useFakeTimers();

    const mockComputed: ComputedData = {
      yamlDocument: YAML.parseDocument('name: test'),
      yamlLineCounter: new LineCounter(),
      workflowLookup: { steps: {} },
    };

    performComputation.mockReturnValue(mockComputed);

    // Initialize computed
    store.dispatch(setYamlString('name: first'));
    expect(performComputation).toHaveBeenCalledTimes(1);
    performComputation.mockClear();

    // Dispatch two rapid changes
    store.dispatch(setYamlString('name: second'));
    jest.advanceTimersByTime(200);
    store.dispatch(setYamlString('name: third'));

    // Only the latest should be computed after the debounce
    jest.advanceTimersByTime(500);

    expect(performComputation).toHaveBeenCalledTimes(1);
    expect(performComputation).toHaveBeenCalledWith('name: third', undefined);

    jest.useRealTimers();
  });
});
