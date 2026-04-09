/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useSelectTextPartsWithArrowKeys } from './use_select_text_parts_with_arrow_keys';

function createInput(value: string) {
  const input = document.createElement('input');
  input.value = value;
  document.body.appendChild(input);
  return input;
}

function pressKey(el: HTMLInputElement, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function selection(el: HTMLInputElement) {
  return [el.selectionStart, el.selectionEnd] as const;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useSelectTextPartsWithArrowKeys', () => {
  describe('isActive', () => {
    it('does not attach listeners when inactive', () => {
      const input = createInput('Jan 1, 2026');
      input.setSelectionRange(5, 5);
      const ref = { current: input };
      renderHook(() => useSelectTextPartsWithArrowKeys({ inputRef: ref, isActive: false }));

      pressKey(input, 'ArrowRight');
      // Selection unchanged — hook did not intercept the key
      expect(selection(input)).toEqual([5, 5]);
    });

    it('attaches listeners when active', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'none',
        })
      );

      // Set caret at position 0 so ArrowRight picks up the first part
      input.setSelectionRange(0, 0);
      pressKey(input, 'ArrowRight');
      // "Jan" at [0, 3]
      expect(selection(input)).toEqual([0, 3]);
    });
  });

  describe('initialSelection', () => {
    it('selects all text by default', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      const selectSpy = jest.spyOn(input, 'select');

      renderHook(() => useSelectTextPartsWithArrowKeys({ inputRef: ref, isActive: true }));

      expect(selectSpy).toHaveBeenCalled();
    });

    it('selects the first part when set to "first"', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
        })
      );

      expect(selection(input)).toEqual([0, 3]);
    });

    it('does not change selection when set to "none"', () => {
      const input = createInput('Jan 1, 2026');
      input.setSelectionRange(2, 2);
      const ref = { current: input };
      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'none',
        })
      );

      expect(selection(input)).toEqual([2, 2]);
    });
  });

  describe('ArrowRight / ArrowLeft navigation', () => {
    it('navigates parts forward with ArrowRight', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
        })
      );

      // Initial: "Jan" selected [0, 3]
      expect(selection(input)).toEqual([0, 3]);

      pressKey(input, 'ArrowRight');
      // "1" at [4, 5]
      expect(selection(input)).toEqual([4, 5]);

      pressKey(input, 'ArrowRight');
      // "2026" at [7, 11]
      expect(selection(input)).toEqual([7, 11]);
    });

    it('navigates parts backward with ArrowLeft', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
        })
      );

      // Move to "2026"
      pressKey(input, 'ArrowRight');
      pressKey(input, 'ArrowRight');
      expect(selection(input)).toEqual([7, 11]);

      pressKey(input, 'ArrowLeft');
      // Back to "1"
      expect(selection(input)).toEqual([4, 5]);
    });

    it('enters caret mode when navigating past the last part', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
        })
      );

      // Navigate to last part "2026", then one more step
      pressKey(input, 'ArrowRight');
      pressKey(input, 'ArrowRight');
      pressKey(input, 'ArrowRight');
      // Caret at end, no selection
      expect(selection(input)).toEqual([11, 11]);
    });

    it('enters caret mode when navigating before the first part', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
        })
      );

      // One step left from the first part
      pressKey(input, 'ArrowLeft');
      // Caret at start, no selection
      expect(selection(input)).toEqual([0, 0]);
    });
  });

  describe('onModifyPart', () => {
    it('is called with correct args on ArrowUp', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      const onModifyPart = jest.fn().mockReturnValue(undefined);

      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
          onModifyPart,
        })
      );

      // Move to "1"
      pressKey(input, 'ArrowRight');

      pressKey(input, 'ArrowUp');
      expect(onModifyPart).toHaveBeenCalledWith({
        text: 'Jan 1, 2026',
        part: { text: '1', start: 4, end: 5 },
        action: 'increase',
      });
    });

    it('is called with correct args on ArrowDown', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      const onModifyPart = jest.fn().mockReturnValue(undefined);

      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
          onModifyPart,
        })
      );

      // Move to "2026"
      pressKey(input, 'ArrowRight');
      pressKey(input, 'ArrowRight');

      pressKey(input, 'ArrowDown');
      expect(onModifyPart).toHaveBeenCalledWith({
        text: 'Jan 1, 2026',
        part: { text: '2026', start: 7, end: 11 },
        action: 'decrease',
      });
    });

    it('updates the input value when callback returns a new string', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      const onModifyPart = jest.fn().mockReturnValue('Jan 2, 2026');

      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
          onModifyPart,
        })
      );

      // Move to "1"
      pressKey(input, 'ArrowRight');
      pressKey(input, 'ArrowUp');

      expect(input.value).toBe('Jan 2, 2026');
      // "2" is re-selected at [4, 5]
      expect(selection(input)).toEqual([4, 5]);
    });

    it('is a no-op when not provided', () => {
      const input = createInput('Jan 1, 2026');
      const ref = { current: input };
      renderHook(() =>
        useSelectTextPartsWithArrowKeys({
          inputRef: ref,
          isActive: true,
          initialSelection: 'first',
        })
      );

      // Move to "1"
      pressKey(input, 'ArrowRight');
      pressKey(input, 'ArrowUp');

      // Value unchanged
      expect(input.value).toBe('Jan 1, 2026');
      // "1" is still selected at [4, 5]
      expect(selection(input)).toEqual([4, 5]);
    });
  });
});
