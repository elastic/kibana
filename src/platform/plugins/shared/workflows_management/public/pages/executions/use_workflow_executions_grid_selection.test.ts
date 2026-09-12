/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useWorkflowExecutionsGridSelection } from './use_workflow_executions_grid_selection';

describe('useWorkflowExecutionsGridSelection', () => {
  it('toggles individual execution selection', () => {
    const { result } = renderHook(() => useWorkflowExecutionsGridSelection(['exec-1', 'exec-2']));

    act(() => {
      result.current.toggleExecutionSelection('exec-1');
    });

    expect(result.current.selectedExecutionIds).toEqual(['exec-1']);
    expect(result.current.isExecutionSelected('exec-1')).toBe(true);
    expect(result.current.isExecutionSelected('exec-2')).toBe(false);

    act(() => {
      result.current.toggleExecutionSelection('exec-1');
    });

    expect(result.current.selectedExecutionIds).toEqual([]);
  });

  it('selects and deselects all visible executions', () => {
    const { result } = renderHook(() => useWorkflowExecutionsGridSelection(['exec-1', 'exec-2']));

    act(() => {
      result.current.selectAllVisibleExecutions();
    });

    expect(result.current.selectedExecutionIds).toEqual(['exec-1', 'exec-2']);
    expect(result.current.getVisibleSelectionState()).toEqual({
      areAllVisibleSelected: true,
      isIndeterminate: false,
    });

    act(() => {
      result.current.deselectVisibleExecutions();
    });

    expect(result.current.selectedExecutionIds).toEqual([]);
  });

  it('supports shift-click range selection', () => {
    const { result } = renderHook(() =>
      useWorkflowExecutionsGridSelection(['exec-1', 'exec-2', 'exec-3'])
    );

    act(() => {
      result.current.toggleExecutionSelection('exec-1');
    });

    act(() => {
      result.current.toggleExecutionSelection('exec-3', true);
    });

    expect(result.current.selectedExecutionIds).toEqual(['exec-1', 'exec-2', 'exec-3']);
  });

  it('clears all selected executions', () => {
    const { result } = renderHook(() => useWorkflowExecutionsGridSelection(['exec-1', 'exec-2']));

    act(() => {
      result.current.selectAllVisibleExecutions();
      result.current.clearAllSelectedExecutions();
    });

    expect(result.current.selectedExecutionIds).toEqual([]);
    expect(result.current.selectedExecutionsCount).toBe(0);
  });
});
