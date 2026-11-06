/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import { useTimePickerPopover } from './use_time_picker_popover';

describe('useTimePickerPopover', () => {
  // Editor at x=50, width=800, so right edge is at 850
  const createMockEditorRef = () => {
    const ref: React.MutableRefObject<Partial<monaco.editor.IStandaloneCodeEditor> | undefined> = {
      current: {
        getPosition: jest.fn().mockReturnValue({ lineNumber: 1, column: 5 }),
        getDomNode: jest.fn().mockReturnValue({
          getBoundingClientRect: () => ({ top: 100, left: 50, width: 800, right: 850 }),
        }),
        getScrolledVisiblePosition: jest.fn().mockReturnValue({ top: 20, left: 40 }),
      },
    };
    return ref as React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  };

  const createMockPopoverRef = (): React.MutableRefObject<HTMLDivElement | null> => ({
    current: { focus: jest.fn() } as unknown as HTMLDivElement,
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useTimePickerPopover({
        editorRef: createMockEditorRef(),
        popoverRef: createMockPopoverRef(),
      })
    );

    expect(result.current.popoverPosition).toEqual({});
    expect(result.current.datePickerOpenStatusRef.current).toBe(false);
    expect(result.current.timePickerDate).toBeDefined();
  });

  it('opens the popover with correct position', () => {
    const editorRef = createMockEditorRef();
    const popoverRef = createMockPopoverRef();
    const { result } = renderHook(() => useTimePickerPopover({ editorRef, popoverRef }));

    act(() => {
      result.current.openTimePickerPopover();
      // Flush requestAnimationFrame for the deferred focus call
      jest.runAllTimers();
    });

    // absoluteTop = editorTop (100) + editorPosition.top (20) + 25 = 145
    // absoluteLeft = editorLeft (50) + editorPosition.left (40) = 90
    expect(result.current.popoverPosition).toEqual({ top: 145, left: 90 });
    expect(result.current.datePickerOpenStatusRef.current).toBe(true);
  });

  it('adjusts left position when popover would overflow editor right edge', () => {
    const editorRef = createMockEditorRef();
    // Cursor far right: absoluteLeft = 50 + 800 = 850
    // 850 + DATEPICKER_WIDTH(373) = 1223 > editorCoords.right(850) → triggers adjustment
    (editorRef.current!.getScrolledVisiblePosition as jest.Mock).mockReturnValue({
      top: 20,
      left: 800,
    });
    const popoverRef = createMockPopoverRef();

    const { result } = renderHook(() => useTimePickerPopover({ editorRef, popoverRef }));

    act(() => {
      result.current.openTimePickerPopover();
    });

    // adjustedLeft = 850 - 373 = 477
    expect(result.current.popoverPosition.left).toBe(477);
  });

  it('does not adjust when popover fits within editor', () => {
    const editorRef = createMockEditorRef();
    // Cursor near left: absoluteLeft = 50 + 40 = 90
    // 90 + DATEPICKER_WIDTH(373) = 463 < editorCoords.right(850) → no adjustment
    const popoverRef = createMockPopoverRef();

    const { result } = renderHook(() => useTimePickerPopover({ editorRef, popoverRef }));

    act(() => {
      result.current.openTimePickerPopover();
    });

    expect(result.current.popoverPosition.left).toBe(90);
  });

  it('does nothing when editor has no cursor position', () => {
    const editorRef = createMockEditorRef();
    (editorRef.current!.getPosition as jest.Mock).mockReturnValue(null);
    const popoverRef = createMockPopoverRef();

    const { result } = renderHook(() => useTimePickerPopover({ editorRef, popoverRef }));

    act(() => {
      result.current.openTimePickerPopover();
    });

    expect(result.current.popoverPosition).toEqual({});
    expect(result.current.datePickerOpenStatusRef.current).toBe(false);
  });

  it('sets the time picker date to nearest half hour', () => {
    const editorRef = createMockEditorRef();
    const popoverRef = createMockPopoverRef();

    const { result } = renderHook(() => useTimePickerPopover({ editorRef, popoverRef }));

    act(() => {
      result.current.openTimePickerPopover();
    });

    const minutes = result.current.timePickerDate.minutes();
    expect(minutes % 30).toBe(0);
    expect(result.current.timePickerDate.seconds()).toBe(0);
    expect(result.current.timePickerDate.milliseconds()).toBe(0);
  });
});
