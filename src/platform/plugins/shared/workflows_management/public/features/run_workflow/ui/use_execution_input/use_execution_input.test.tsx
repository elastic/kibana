/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useExecutionInput } from './use_execution_input';

describe('useExecutionInput', () => {
  const workflowName = 'test-workflow';
  const manualTrigger = 'manual';
  const scheduledTrigger = 'scheduled';

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with empty execution input', () => {
      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      expect(result.current.executionInput).toBe('');
    });

    it('should load saved input from localStorage on mount for manual trigger', async () => {
      const savedInput = { test: 'data', foo: 'bar' };
      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      localStorage.setItem(localStorageKey, JSON.stringify(savedInput));

      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      await waitFor(() => {
        expect(result.current.executionInput).toBe(JSON.stringify(savedInput, null, 2));
      });
    });

    it('should not load input from localStorage for non-manual trigger', () => {
      const savedInput = { test: 'data' };
      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      localStorage.setItem(localStorageKey, JSON.stringify(savedInput));

      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: scheduledTrigger,
        })
      );

      expect(result.current.executionInput).toBe('');
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      localStorage.setItem(localStorageKey, 'invalid-json{');

      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      // Should not crash and remain with empty input
      expect(result.current.executionInput).toBe('');
    });
  });

  describe('localStorage key generation', () => {
    it('should generate correct localStorage key for manual trigger', () => {
      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      const expectedKey = `workflow-${manualTrigger}-input-${workflowName}`;
      act(() => {
        result.current.setExecutionInput('{"test": "value"}');
      });

      expect(localStorage.getItem(expectedKey)).toBeTruthy();
    });

    it('should not generate localStorage key for non-manual trigger', () => {
      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: scheduledTrigger,
        })
      );

      act(() => {
        result.current.setExecutionInput('{"test": "value"}');
      });

      const manualKey = `workflow-${manualTrigger}-input-${workflowName}`;
      const scheduledKey = `workflow-${scheduledTrigger}-input-${workflowName}`;

      expect(localStorage.getItem(manualKey)).toBeNull();
      expect(localStorage.getItem(scheduledKey)).toBeNull();
    });

    it('should not generate localStorage key when workflowName is empty', () => {
      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName: '',
          selectedTrigger: manualTrigger,
        })
      );

      act(() => {
        result.current.setExecutionInput('{"test": "value"}');
      });

      // Should not save anything to localStorage
      expect(localStorage.length).toBe(0);
    });
  });

  describe('saving to localStorage', () => {
    it('should save valid JSON input to localStorage', () => {
      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      const inputData = { test: 'value', nested: { key: 'data' } };
      const formattedInput = JSON.stringify(inputData, null, 2);

      act(() => {
        result.current.setExecutionInput(formattedInput);
      });

      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      const savedValue = localStorage.getItem(localStorageKey);

      // Should save minimized JSON
      expect(savedValue).toBe(JSON.stringify(inputData));
    });

    it('should remove localStorage entry when input is empty', () => {
      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      localStorage.setItem(localStorageKey, '{"test": "value"}');

      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      act(() => {
        result.current.setExecutionInput('');
      });

      expect(localStorage.getItem(localStorageKey)).toBeNull();
    });

    it('should remove localStorage entry when input is only whitespace', () => {
      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      localStorage.setItem(localStorageKey, '{"test": "value"}');

      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      act(() => {
        result.current.setExecutionInput('   \n  \t  ');
      });

      expect(localStorage.getItem(localStorageKey)).toBeNull();
    });

    it('should handle invalid JSON gracefully when saving', () => {
      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;

      // Should not crash when trying to save invalid JSON
      act(() => {
        result.current.setExecutionInput('invalid-json{');
      });

      // Should not save anything
      expect(localStorage.getItem(localStorageKey)).toBeNull();
    });
  });

  describe('formatting', () => {
    it('should format loaded JSON with proper indentation', async () => {
      const inputData = { test: 'value', nested: { key: 'data' } };
      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      // Save minimized JSON
      localStorage.setItem(localStorageKey, JSON.stringify(inputData));

      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      await waitFor(() => {
        // Should load formatted JSON
        expect(result.current.executionInput).toBe(JSON.stringify(inputData, null, 2));
      });
    });

    it('should preserve formatted input in state while saving minimized to localStorage', () => {
      const { result } = renderHook(() =>
        useExecutionInput({
          workflowName,
          selectedTrigger: manualTrigger,
        })
      );

      const inputData = { test: 'value', nested: { key: 'data' } };
      const formattedInput = JSON.stringify(inputData, null, 2);

      act(() => {
        result.current.setExecutionInput(formattedInput);
      });

      // State should have formatted input
      expect(result.current.executionInput).toBe(formattedInput);

      // localStorage should have minimized input
      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      const savedValue = localStorage.getItem(localStorageKey);
      expect(savedValue).toBe(JSON.stringify(inputData));
    });
  });

  describe('trigger changes', () => {
    it('should handle trigger change from manual to scheduled', () => {
      const { result, rerender } = renderHook(
        ({ workflowName: name, selectedTrigger }) =>
          useExecutionInput({ workflowName: name, selectedTrigger }),
        {
          initialProps: { workflowName, selectedTrigger: manualTrigger },
        }
      );

      const inputData = { test: 'value' };
      act(() => {
        result.current.setExecutionInput(JSON.stringify(inputData, null, 2));
      });

      // Change to scheduled trigger
      rerender({ workflowName, selectedTrigger: scheduledTrigger });

      // Input should remain in state
      expect(result.current.executionInput).toBe(JSON.stringify(inputData, null, 2));

      // Should not affect manual trigger's localStorage
      const manualKey = `workflow-${manualTrigger}-input-${workflowName}`;
      expect(localStorage.getItem(manualKey)).toBeTruthy();
    });

    it('should handle trigger change from scheduled to manual', async () => {
      const savedInput = { test: 'saved' };
      const localStorageKey = `workflow-${manualTrigger}-input-${workflowName}`;
      localStorage.setItem(localStorageKey, JSON.stringify(savedInput));

      const { result, rerender } = renderHook(
        ({ workflowName: name, selectedTrigger }) =>
          useExecutionInput({ workflowName: name, selectedTrigger }),
        {
          initialProps: { workflowName, selectedTrigger: scheduledTrigger },
        }
      );

      // Initially should be empty
      expect(result.current.executionInput).toBe('');

      // Change to manual trigger
      rerender({ workflowName, selectedTrigger: manualTrigger });

      await waitFor(() => {
        // Should load saved input
        expect(result.current.executionInput).toBe(JSON.stringify(savedInput, null, 2));
      });
    });
  });

  describe('workflow name changes', () => {
    it('should save to correct localStorage key when workflow name changes', () => {
      const workflow1 = 'workflow-1';
      const workflow2 = 'workflow-2';

      const { result, rerender } = renderHook(
        ({ workflowName: name, selectedTrigger }) =>
          useExecutionInput({ workflowName: name, selectedTrigger }),
        {
          initialProps: { workflowName: workflow1, selectedTrigger: manualTrigger },
        }
      );

      const input1 = { workflow: 'one' };
      act(() => {
        result.current.setExecutionInput(JSON.stringify(input1, null, 2));
      });

      expect(localStorage.getItem(`workflow-${manualTrigger}-input-${workflow1}`)).toBeTruthy();

      // Change workflow name
      rerender({ workflowName: workflow2, selectedTrigger: manualTrigger });

      const input2 = { workflow: 'two' };
      act(() => {
        result.current.setExecutionInput(JSON.stringify(input2, null, 2));
      });

      expect(localStorage.getItem(`workflow-${manualTrigger}-input-${workflow2}`)).toBeTruthy();

      // Both should exist
      expect(localStorage.getItem(`workflow-${manualTrigger}-input-${workflow1}`)).toBe(
        JSON.stringify(input1)
      );
      expect(localStorage.getItem(`workflow-${manualTrigger}-input-${workflow2}`)).toBe(
        JSON.stringify(input2)
      );
    });
  });

  describe('workflow ID cache isolation', () => {
    it('should prevent cache collision for workflows with same name but different IDs', () => {
      const sharedName = 'shared-workflow-name';
      const workflowId1 = 'id-1';
      const workflowId2 = 'id-2';

      // First workflow with ID
      const { result: result1 } = renderHook(() =>
        useExecutionInput({
          workflowName: sharedName,
          workflowId: workflowId1,
          selectedTrigger: manualTrigger,
        })
      );

      const input1 = { workflow: 'first' };
      act(() => {
        result1.current.setExecutionInput(JSON.stringify(input1, null, 2));
      });

      // Second workflow with same name but different ID
      const { result: result2 } = renderHook(() =>
        useExecutionInput({
          workflowName: sharedName,
          workflowId: workflowId2,
          selectedTrigger: manualTrigger,
        })
      );

      // Second workflow should NOT load first workflow's input
      expect(result2.current.executionInput).toBe('');

      const input2 = { workflow: 'second' };
      act(() => {
        result2.current.setExecutionInput(JSON.stringify(input2, null, 2));
      });

      // Both should have separate cache entries
      const key1 = `workflow-${manualTrigger}-input-${workflowId1}`;
      const key2 = `workflow-${manualTrigger}-input-${workflowId2}`;

      expect(localStorage.getItem(key1)).toBe(JSON.stringify(input1));
      expect(localStorage.getItem(key2)).toBe(JSON.stringify(input2));
    });

    it('should use workflowId when provided, fallback to workflowName when not', async () => {
      const testWorkflowName = 'test-workflow';
      const workflowId = 'unique-id';

      // Test with ID
      const savedInputWithId = { test: 'with-id' };
      const idKey = `workflow-${manualTrigger}-input-${workflowId}`;
      localStorage.setItem(idKey, JSON.stringify(savedInputWithId));

      const { result: resultWithId } = renderHook(() =>
        useExecutionInput({
          workflowName: testWorkflowName,
          workflowId,
          selectedTrigger: manualTrigger,
        })
      );

      await waitFor(() => {
        expect(resultWithId.current.executionInput).toBe(JSON.stringify(savedInputWithId, null, 2));
      });

      // Test without ID (fallback to name)
      const savedInputWithoutId = { test: 'without-id' };
      const nameKey = `workflow-${manualTrigger}-input-${testWorkflowName}`;
      localStorage.setItem(nameKey, JSON.stringify(savedInputWithoutId));

      const { result: resultWithoutId } = renderHook(() =>
        useExecutionInput({
          workflowName: testWorkflowName,
          selectedTrigger: manualTrigger,
        })
      );

      await waitFor(() => {
        expect(resultWithoutId.current.executionInput).toBe(
          JSON.stringify(savedInputWithoutId, null, 2)
        );
      });
    });
  });
});
