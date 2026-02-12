/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, type RefObject } from 'react';

// Matches text parts separated by spaces, commas, or colons
// e.g. "Dec 29, 14:30 to now" => ["Dec", "29", "14", "30", "to", "now"]
const TEXT_PARTS_REGEX = /[^\s,:]+/g;

export interface TextPart {
  text: string;
  start: number;
  end: number;
}

interface UseSelectTextPartsOptions {
  /** Ref to the input element */
  inputRef: RefObject<HTMLInputElement>;
  /** Whether the hook is active (e.g. when the input is mounted) */
  isActive: boolean;
  /**
   * What to select when the hook first becomes active.
   * - `'all'` selects the entire input text (default)
   * - `'first'` selects the first text part
   * - `'none'` leaves the caret as-is
   * @default 'all'
   */
  initialSelection?: 'none' | 'first' | 'all';
  /**
   * Called when ArrowUp/ArrowDown is pressed on a selected part.
   * Return the new full input text, or `undefined` to skip the modification.
   */
  onModifyPart?: (params: {
    text: string;
    part: TextPart;
    action: 'increase' | 'decrease';
  }) => string | undefined;
}

/**
 * Hook to navigate through the text parts of a text input with arrow keys.
 * Optionally supports modifying parts via ArrowUp/ArrowDown when `onModifyPart` is provided.
 */
export function useSelectTextPartsWithArrowKeys({
  inputRef,
  isActive,
  initialSelection = 'all',
  onModifyPart,
}: UseSelectTextPartsOptions) {
  // Stored in a ref so the effect doesn't re-run
  // (and re-trigger initialSelection) when the callback changes
  const onModifyPartRef = useRef(onModifyPart);
  onModifyPartRef.current = onModifyPart;

  useEffect(() => {
    if (!isActive) return;

    let currentIndex = -1; // -1 means no part is selected (caret mode)

    const getPartsAndSyncIndex = () => {
      const inputEl = inputRef.current;
      if (!inputEl) return [];

      const parts = getTextParts(inputEl.value);
      const matchingPartIndex = parts.findIndex(
        (part) => part.start === inputEl.selectionStart && part.end === inputEl.selectionEnd
      );
      currentIndex = matchingPartIndex; // -1 if selection doesn't match any part

      return parts;
    };

    const selectPart = (index: number, parts: TextPart[]) => {
      const inputEl = inputRef.current;
      if (!inputEl) return;

      // If navigating past the ends, go to caret mode
      if (index < 0) {
        currentIndex = -1;
        inputEl.setSelectionRange(0, 0);
        inputEl.scrollLeft = 0;
        return;
      }
      if (index >= parts.length) {
        currentIndex = -1;
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
        inputEl.scrollLeft = inputEl.scrollWidth - inputEl.clientWidth;
        return;
      }

      currentIndex = index;
      const part = parts[currentIndex];

      inputEl.focus();
      inputEl.setSelectionRange(part.start, part.end);
      inputEl.scrollLeft = getInputScrollPositionFromStart(inputEl, part.start);
    };

    const modifyPart = (action: 'increase' | 'decrease') => {
      if (!onModifyPartRef.current) return;

      const inputEl = inputRef.current;
      if (!inputEl) return;

      const parts = getPartsAndSyncIndex();
      if (currentIndex < 0 || currentIndex >= parts.length) return;

      const part = parts[currentIndex];
      const newText = onModifyPartRef.current({ text: inputEl.value, part, action });

      if (newText !== undefined) {
        inputEl.value = newText;
        const updatedParts = getTextParts(newText);
        selectPart(currentIndex, updatedParts);
      }
    };

    const keydownHandler = (event: KeyboardEvent) => {
      // Skip if modifier keys are pressed
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const inputEl = inputRef.current;
      if (!inputEl) return;

      if (event.key.startsWith('Arrow')) {
        // Always refresh parts and sync index on arrow key press
        const parts = getPartsAndSyncIndex();

        if (parts.length === 0) return;

        event.preventDefault();

        switch (event.key) {
          case 'ArrowRight':
            // If in caret mode, select the first part to the right of caret
            if (currentIndex === -1) {
              const caretPos = inputEl.selectionStart ?? 0;
              const nextPartIndex = parts.findIndex((part) => part.start >= caretPos);
              selectPart(nextPartIndex !== -1 ? nextPartIndex : parts.length, parts);
            } else {
              selectPart(currentIndex + 1, parts);
            }
            return;
          case 'ArrowLeft':
            // If in caret mode, select the first part to the left of caret
            if (currentIndex === -1) {
              const caretPos = inputEl.selectionStart ?? 0;
              const prevPartIndex = parts.findLastIndex((part) => part.end <= caretPos);
              selectPart(prevPartIndex, parts);
            } else {
              selectPart(currentIndex - 1, parts);
            }
            return;
          case 'ArrowUp':
            modifyPart('increase');
            return;
          case 'ArrowDown':
            event.stopImmediatePropagation();
            modifyPart('decrease');
            return;
        }
      }
    };

    const inputEl = inputRef.current;

    inputEl?.addEventListener('keydown', keydownHandler);

    if (inputEl) {
      switch (initialSelection) {
        case 'none':
          break;
        case 'first': {
          const parts = getTextParts(inputEl.value);
          if (parts.length > 0) selectPart(0, parts);
          break;
        }
        case 'all':
        default:
          inputEl.select();
          break;
      }
    }

    return () => {
      inputEl?.removeEventListener('keydown', keydownHandler);
    };
  }, [inputRef, isActive, initialSelection]);
}

/**
 * Splits a string into parts separated by spaces, commas, or colons,
 * and returns each part with its text and position indices.
 * @param value - The string to split
 * @returns Array of parts with their text and start/end positions
 */
function getTextParts(value: string): TextPart[] {
  return Array.from(value.matchAll(TEXT_PARTS_REGEX), (match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/**
 * Computes the scroll position needed to center a given caret position within a text input.
 * Uses Canvas text measurement to avoid DOM manipulation and layout thrashing.
 * @param input - The input element to measure
 * @param start - The character index to center on
 * @returns The `scrollLeft` value to apply, or `0` if the input is not scrollable
 */
function getInputScrollPositionFromStart(input: HTMLInputElement, start: number): number {
  if (input.scrollWidth <= input.clientWidth) return 0;

  const textBeforeCaret = input.value.substring(0, start);
  const style = window.getComputedStyle(input);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = style.font;
  const textWidth = ctx.measureText(textBeforeCaret).width;
  const offset = parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth);

  return textWidth + offset - input.clientWidth / 2;
}
