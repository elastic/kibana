/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { monaco } from '@kbn/monaco';
import { useYamlValidation } from './use_yaml_validation';
import { selectDetail } from '../../../entities/workflows/store';
import { createWorkflowsStore } from '../../../entities/workflows/store/store';
import {
  setActiveTab,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { createStartServicesMock } from '../../../mocks';

jest.mock('../../../hooks/use_kibana');

// Mock Monaco editor
const createMockEditor = (value: string) => {
  const lines = value.split('\n');
  const model = {
    getValue: () => value,
    getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
    getLineMaxColumn: (lineNumber: number) => {
      const line = lines[lineNumber - 1];
      return line ? line.length + 1 : 1;
    },
    uri: { path: '/test.yaml' },
  };

  return {
    getModel: () => model,
    createDecorationsCollection: jest.fn(() => ({
      clear: jest.fn(),
    })),
  };
};

// Mock Monaco setModelMarkers
const mockSetModelMarkers = jest.fn();
(monaco.editor as any).setModelMarkers = mockSetModelMarkers;

// Mock schema functions
jest.mock('../../../../common/schema', () => ({
  ...jest.requireActual('../../../../common/schema'),
  getCachedDynamicConnectorTypes: jest.fn(() => ({})),
  getWorkflowZodSchemaLoose: jest.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { z } = require('@kbn/zod/v4');
    // mock actual schema, we only test the name uniqueness validation
    return z
      .object({
        version: z.string().optional(),
        name: z.string(),
        enabled: z.boolean().optional(),
        triggers: z.array(z.any()).optional(),
        steps: z
          .array(
            z.object({
              name: z.string(),
              type: z.string(),
            })
          )
          .optional(),
      })
      .passthrough();
  }),
}));

// Helper to render hook with proper Redux context
const renderHookWithProviders = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  yamlContent: string
) => {
  const store = createWorkflowsStore(createStartServicesMock());

  // Set the YAML content which will trigger computation via middleware
  store.dispatch(setYamlString(yamlContent));
  store.dispatch(setActiveTab('workflow'));

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Provider, { store }, children);
  };

  return {
    ...renderHook(() => useYamlValidation(editor), { wrapper }),
    store,
  };
};

describe('useYamlValidation - Step Name Uniqueness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should not report errors for unique step names', async () => {
    const yamlContent = `
version: "1"
name: "Test Workflow"
enabled: true
triggers:
  - type: manual
    enabled: true
steps:
  - name: step1
    type: console
  - name: step2
    type: http
  - name: step3
    type: console
`;

    const mockEditor = createMockEditor(yamlContent);
    const { result, store } = renderHookWithProviders(mockEditor as any, yamlContent);

    // Fast-forward through the debounced computation
    jest.advanceTimersByTime(500);

    // Wait for the Redux state to have computed data
    await waitFor(
      () => {
        const state = selectDetail(store.getState());
        // Debug: log the state to understand what's happening
        // console.log('Redux state:', JSON.stringify(state, null, 2));
        expect(state.computed).toBeDefined();
        expect(state.computed?.yamlDocument).toBeDefined();
        expect(state.computed?.workflowDefinition).toBeDefined();
      },
      { timeout: 2000 }
    );

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    // Wait for Monaco markers to be set
    await waitFor(() => {
      const stepNameCalls = mockSetModelMarkers.mock.calls.filter(
        (call) => call[1] === 'step-name-validation'
      );
      expect(stepNameCalls.length).toBeGreaterThan(0);
    });

    // Should call setModelMarkers for step-name-validation with empty array
    const stepNameCalls = mockSetModelMarkers.mock.calls.filter(
      (call) => call[1] === 'step-name-validation'
    );
    expect(stepNameCalls[0][2]).toEqual([]);
  });

  it('should report errors for duplicate step names', async () => {
    const yamlContent = `
version: "1"
name: "Test Workflow"
enabled: true
triggers:
  - type: manual
    enabled: true
steps:
  - name: step1
    type: console
  - name: step2
    type: http
  - name: step1
    type: console
`;

    const mockEditor = createMockEditor(yamlContent);
    const { result } = renderHookWithProviders(mockEditor as any, yamlContent);

    // Fast-forward through the debounced computation
    jest.advanceTimersByTime(500);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    // Should call setModelMarkers for step-name-validation with errors
    const stepNameCalls = mockSetModelMarkers.mock.calls.filter(
      (call) => call[1] === 'step-name-validation'
    );
    expect(stepNameCalls).toHaveLength(1);
    const markers = stepNameCalls[0][2];
    expect(markers).toHaveLength(2); // Two errors for the duplicate "step1"

    markers.forEach((marker: any) => {
      expect(marker.message).toContain('Step name "step1" is not unique');
      expect(marker.message).toContain('Found 2 steps with this name');
    });
  });

  it('should handle nested steps in foreach', async () => {
    const yamlContent = `
name: "Test Workflow"
steps:
  - name: foreach_step
    type: foreach
    foreach: items
    steps:
      - name: nested_step
        type: console
      - name: nested_step
        type: http
`;

    const mockEditor = createMockEditor(yamlContent);
    const { result } = renderHookWithProviders(mockEditor as any, yamlContent);

    // Fast-forward through the debounced computation
    jest.advanceTimersByTime(500);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    const stepNameCalls = mockSetModelMarkers.mock.calls.filter(
      (call) => call[1] === 'step-name-validation'
    );
    expect(stepNameCalls).toHaveLength(1);
    const markers = stepNameCalls[0][2];
    expect(markers).toHaveLength(2); // Two errors for the duplicate "nested_step"

    markers.forEach((marker: any) => {
      expect(marker.message).toContain('Step name "nested_step" is not unique');
    });
  });

  it('should handle nested steps in if/else', async () => {
    const yamlContent = `
name: "Test Workflow"
steps:
  - name: if_step
    type: if
    condition: true
    steps:
      - name: duplicate_name
        type: console
    else:
      - name: duplicate_name
        type: http
`;

    const mockEditor = createMockEditor(yamlContent);
    const { result } = renderHookWithProviders(mockEditor as any, yamlContent);

    // Fast-forward through the debounced computation
    jest.advanceTimersByTime(500);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    const stepNameCalls = mockSetModelMarkers.mock.calls.filter(
      (call) => call[1] === 'step-name-validation'
    );
    expect(stepNameCalls).toHaveLength(1);
    const markers = stepNameCalls[0][2];
    expect(markers).toHaveLength(2); // Two errors for the duplicate "duplicate_name"

    markers.forEach((marker: any) => {
      expect(marker.message).toContain('Step name "duplicate_name" is not unique');
    });
  });

  it('should handle nested steps in parallel branches', async () => {
    const yamlContent = `
name: "Test Workflow"
steps:
  - name: parallel_step
    type: parallel
    branches:
      - steps:
          - name: branch_step
            type: console
      - steps:
          - name: branch_step
            type: http
`;

    const mockEditor = createMockEditor(yamlContent);
    const { result } = renderHookWithProviders(mockEditor as any, yamlContent);

    // Fast-forward through the debounced computation
    jest.advanceTimersByTime(500);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    const stepNameCalls = mockSetModelMarkers.mock.calls.filter(
      (call) => call[1] === 'step-name-validation'
    );
    expect(stepNameCalls).toHaveLength(1);
    const markers = stepNameCalls[0][2];
    expect(markers).toHaveLength(2); // Two errors for the duplicate "branch_step"

    markers.forEach((marker: any) => {
      expect(marker.message).toContain('Step name "branch_step" is not unique');
    });
  });

  it('should handle complex nested scenarios with multiple duplicates', async () => {
    const yamlContent = `
name: "Test Workflow"
steps:
  - name: root_step
    type: console
  - name: foreach_step
    type: foreach
    foreach: items
    steps:
      - name: root_step
        type: console
      - name: inner_step
        type: http
  - name: if_step
    type: if
    condition: true
    steps:
      - name: inner_step
        type: console
    else:
      - name: root_step
        type: http
`;

    const mockEditor = createMockEditor(yamlContent);
    const { result } = renderHookWithProviders(mockEditor as any, yamlContent);

    // Fast-forward through the debounced computation
    jest.advanceTimersByTime(500);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    const stepNameCalls = mockSetModelMarkers.mock.calls.filter(
      (call) => call[1] === 'step-name-validation'
    );
    expect(stepNameCalls).toHaveLength(1);
    const markers = stepNameCalls[0][2];

    // Should have 5 errors: 3 for "root_step", 2 for "inner_step"
    expect(markers).toHaveLength(5);

    const rootStepErrors = markers.filter((m: any) => m.message.includes('root_step'));
    const innerStepErrors = markers.filter((m: any) => m.message.includes('inner_step'));

    expect(rootStepErrors).toHaveLength(3);
    expect(innerStepErrors).toHaveLength(2);

    rootStepErrors.forEach((marker: any) => {
      expect(marker.message).toContain('Found 3 steps with this name');
    });

    innerStepErrors.forEach((marker: any) => {
      expect(marker.message).toContain('Found 2 steps with this name');
    });
  });
});
