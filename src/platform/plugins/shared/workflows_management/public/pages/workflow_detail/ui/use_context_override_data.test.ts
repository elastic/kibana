/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useContextOverrideData } from './use_context_override_data';

const mockSelectWorkflowGraph = vi.fn();
const mockSelectWorkflowDefinition = vi.fn();
const mockSelectYamlString = vi.fn();
const mockUseSpaceId = vi.fn();
const mockBuildContextOverride = vi.fn();

vi.mock('react-redux-v7', () => {
      const mocked = {
      ...require('react-redux-v7'),
      useSelector: (selector: any) => selector(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../entities/workflows/store/workflow_detail/selectors', () => {
      const mocked = {
      selectWorkflowGraph: () => mockSelectWorkflowGraph(),
      selectWorkflowDefinition: () => mockSelectWorkflowDefinition(),
      selectYamlString: () => mockSelectYamlString(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_space_id', () => {
      const mocked = {
      useSpaceId: () => mockUseSpaceId(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../shared/utils/build_step_context_override/build_step_context_override', () => {
      const mocked = {
      buildContextOverride: (...args: unknown[]) => mockBuildContextOverride(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('uuid', () => {
      const mocked = {
      v4: () => 'mock-uuid-1234',
    };
      return { ...mocked, default: mocked };
    });

describe('useContextOverrideData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a function', () => {
    mockSelectWorkflowGraph.mockReturnValue(null);
    mockSelectWorkflowDefinition.mockReturnValue(null);
    mockSelectYamlString.mockReturnValue(null);
    mockUseSpaceId.mockReturnValue('default');

    const { result } = renderHook(() => useContextOverrideData());

    expect(typeof result.current).toBe('function');
  });

  it('should return null when workflowGraph is not available', () => {
    mockSelectWorkflowGraph.mockReturnValue(null);
    mockSelectWorkflowDefinition.mockReturnValue({ name: 'test' });
    mockSelectYamlString.mockReturnValue('');
    mockUseSpaceId.mockReturnValue('default');

    const { result } = renderHook(() => useContextOverrideData());
    const contextData = result.current('step-1');

    expect(contextData).toBeNull();
  });

  it('should return null when workflowDefinition is not available', () => {
    mockSelectWorkflowGraph.mockReturnValue({ getStepGraph: vi.fn() });
    mockSelectWorkflowDefinition.mockReturnValue(null);
    mockSelectYamlString.mockReturnValue('');
    mockUseSpaceId.mockReturnValue('default');

    const { result } = renderHook(() => useContextOverrideData());
    const contextData = result.current('step-1');

    expect(contextData).toBeNull();
  });

  it('should return null when spaceId is not available', () => {
    mockSelectWorkflowGraph.mockReturnValue({ getStepGraph: vi.fn() });
    mockSelectWorkflowDefinition.mockReturnValue({ name: 'test' });
    mockSelectYamlString.mockReturnValue('');
    mockUseSpaceId.mockReturnValue(undefined);

    const { result } = renderHook(() => useContextOverrideData());
    const contextData = result.current('step-1');

    expect(contextData).toBeNull();
  });

  it('should call buildContextOverride when all data is available', () => {
    const mockStepSubGraph = { steps: [] };
    const mockGraph = {
      getStepGraph: vi.fn().mockReturnValue(mockStepSubGraph),
    };
    const mockDefinition = {
      name: 'test-workflow',
      enabled: true,
      consts: { key: 'value' },
      triggers: [
        {
          type: 'manual',
          inputs: { type: 'object', properties: { name: { type: 'string' } } },
        },
      ],
    };

    mockSelectWorkflowGraph.mockReturnValue(mockGraph);
    mockSelectWorkflowDefinition.mockReturnValue(mockDefinition);
    mockSelectYamlString.mockReturnValue('');
    mockUseSpaceId.mockReturnValue('default');
    mockBuildContextOverride.mockReturnValue({ context: 'data' });

    const { result } = renderHook(() => useContextOverrideData());
    const contextData = result.current('step-1');

    expect(mockGraph.getStepGraph).toHaveBeenCalledWith('step-1');
    expect(mockBuildContextOverride).toHaveBeenCalledWith(mockStepSubGraph, {
      consts: { key: 'value' },
      workflow: {
        id: 'mock-uuid-1234',
        name: 'test-workflow',
        enabled: true,
        spaceId: 'default',
      },
      inputsDefinition: { properties: { name: { type: 'string' } }, type: 'object' },
    });
    expect(contextData).toEqual({ context: 'data' });
  });

  it('should fallback to YAML parsing when inputs are not in workflowDefinition', () => {
    const mockStepSubGraph = { steps: [] };
    const mockGraph = {
      getStepGraph: vi.fn().mockReturnValue(mockStepSubGraph),
    };
    const mockDefinition = {
      name: 'test-workflow',
      enabled: false,
      consts: {},
      inputs: undefined,
    };

    mockSelectWorkflowGraph.mockReturnValue(mockGraph);
    mockSelectWorkflowDefinition.mockReturnValue(mockDefinition);
    mockSelectYamlString.mockReturnValue(
      `
triggers:
  - type: manual
    inputs:
      type: object
      properties:
        name:
          type: string
`.trim()
    );
    mockUseSpaceId.mockReturnValue('default');
    mockBuildContextOverride.mockReturnValue({ context: 'yaml-data' });

    const { result } = renderHook(() => useContextOverrideData());
    result.current('step-1');

    expect(mockBuildContextOverride).toHaveBeenCalledWith(
      mockStepSubGraph,
      expect.objectContaining({
        inputsDefinition: { properties: { name: { type: 'string' } }, type: 'object' },
      })
    );
  });
});
