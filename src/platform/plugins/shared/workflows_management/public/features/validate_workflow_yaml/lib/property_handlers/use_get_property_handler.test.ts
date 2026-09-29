/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { useGetPropertyHandler } from './use_get_property_handler';
import { getPropertyHandler } from '../../../../../common/schema';
import type { InternalStepsEditorHandlers } from '../../../../common/context/internal_steps/editor_handlers/editor_handlers';
import { useWorkflowsContext } from '../../../../common/context/workflows_context';

vi.mock('../../../../../common/schema', () => {
  const mocked = {
    getPropertyHandler: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/context/workflows_context', () => {
  const mocked = {
    useWorkflowsContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockGetPropertyHandler = getPropertyHandler as MockedFunction<typeof getPropertyHandler>;
const mockUseWorkflowsContext = useWorkflowsContext as MockedFunction<typeof useWorkflowsContext>;

describe('useGetPropertyHandler', () => {
  const contractHandler = {
    selection: { search: vi.fn(), resolve: vi.fn(), getDetails: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns internal handler when present on config scope', () => {
    const internalHandler = {
      selection: { search: vi.fn(), resolve: vi.fn(), getDetails: vi.fn() },
    };
    const internalStepsEditorHandlers = {
      getEditorHandlers: vi.fn().mockReturnValue({
        config: { foo: internalHandler },
      }),
    } as unknown as InternalStepsEditorHandlers;
    mockUseWorkflowsContext.mockReturnValue({ internalStepsEditorHandlers });

    const { result } = renderHook(() => useGetPropertyHandler());
    expect(result.current('t', 'config', 'foo')).toBe(internalHandler);
    expect(mockGetPropertyHandler).not.toHaveBeenCalled();
  });

  it('returns internal handler when present on input scope', () => {
    const internalHandler = {
      selection: { search: vi.fn(), resolve: vi.fn(), getDetails: vi.fn() },
    };
    const internalStepsEditorHandlers = {
      getEditorHandlers: vi.fn().mockReturnValue({
        input: { bar: internalHandler },
      }),
    } as unknown as InternalStepsEditorHandlers;
    mockUseWorkflowsContext.mockReturnValue({ internalStepsEditorHandlers });

    const { result } = renderHook(() => useGetPropertyHandler());
    expect(result.current('t', 'input', 'bar')).toBe(internalHandler);
    expect(mockGetPropertyHandler).not.toHaveBeenCalled();
  });

  it('falls back to contract getPropertyHandler when internal has no handler', () => {
    const internalStepsEditorHandlers = {
      getEditorHandlers: vi.fn().mockReturnValue({
        config: {},
      }),
    } as unknown as InternalStepsEditorHandlers;
    mockUseWorkflowsContext.mockReturnValue({ internalStepsEditorHandlers });
    mockGetPropertyHandler.mockReturnValue(contractHandler);

    const { result } = renderHook(() => useGetPropertyHandler());
    expect(result.current('step.type', 'input', 'key')).toBe(contractHandler);
    expect(mockGetPropertyHandler).toHaveBeenCalledWith('step.type', 'input', 'key');
  });

  it('prefers internal handler when both could apply', () => {
    const internalHandler = { selection: { a: 1 } };
    const internalStepsEditorHandlers = {
      getEditorHandlers: vi.fn().mockReturnValue({
        input: { k: internalHandler },
      }),
    } as unknown as InternalStepsEditorHandlers;
    mockUseWorkflowsContext.mockReturnValue({ internalStepsEditorHandlers });
    mockGetPropertyHandler.mockReturnValue(contractHandler);

    const { result } = renderHook(() => useGetPropertyHandler());
    expect(result.current('s', 'input', 'k')).toBe(internalHandler);
    expect(mockGetPropertyHandler).not.toHaveBeenCalled();
  });

  it('returns null when neither internal nor contract provides a handler', () => {
    const internalStepsEditorHandlers = {
      getEditorHandlers: vi.fn().mockReturnValue(undefined),
    } as unknown as InternalStepsEditorHandlers;
    mockUseWorkflowsContext.mockReturnValue({ internalStepsEditorHandlers });
    mockGetPropertyHandler.mockReturnValue(null);

    const { result } = renderHook(() => useGetPropertyHandler());
    expect(result.current('s', 'config', 'x')).toBeNull();
  });
});
