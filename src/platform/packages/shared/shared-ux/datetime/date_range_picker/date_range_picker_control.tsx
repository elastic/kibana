/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type KeyboardEvent, type ChangeEvent, useRef, useEffect, useCallback } from 'react';

import {
  EuiBadge,
  EuiFieldText,
  EuiFormControlButton,
  EuiFormControlLayout,
  useEuiTheme,
} from '@elastic/eui';

import { useDateRangePickerContext, type InitialFocus } from './date_range_picker_context';

// TODO move to constants.ts
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The control portion of the DateRangePicker: displays a button when idle
 * and a text input when editing. Reads all state from context.
 */
export function DateRangePickerControl() {
  const {
    text,
    setText,
    applyRange,
    isInvalid,
    isEditing,
    setIsEditing,
    compressed,
    maxWidth,
    displayText,
    displayDuration,
    inputRef,
    buttonRef,
    panelRef,
    panelId,
    initialFocus,
  } = useDateRangePickerContext();
  const { euiTheme } = useEuiTheme();

  const controlRef = useRef<HTMLDivElement>(null);
  const wasEditingRef = useRef(false);

  /** Focus the button when transitioning from editing to idle. */
  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      buttonRef.current?.focus();
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, buttonRef]);

  const onButtonClick = () => {
    setIsEditing(true);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const onInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && isEditing && text) {
      // Prevent Enter's keyup firing `onButtonClick`
      event.preventDefault();
      applyRange();
    }
    if (event.key === 'Escape' && isEditing) {
      setIsEditing(false);
    }
    if (event.key === 'ArrowDown' && isEditing) {
      event.preventDefault();
      resolveInitialFocus(panelRef, initialFocus)?.focus();
    }
  };

  const onInputClear = () => {
    setText('');
    inputRef.current?.focus();
  };

  /** Exit editing mode when Tab leaves the control in either direction. */
  const onControlKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Tab' || !isEditing) return;

      const control = controlRef.current;
      if (!control) return;

      const tabbables = Array.from(control.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (tabbables.length === 0) return;

      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const isAtBoundary = event.shiftKey
        ? document.activeElement === first
        : document.activeElement === last;

      if (isAtBoundary) {
        event.preventDefault();
        setIsEditing(false);
      }
    },
    [isEditing, setIsEditing]
  );

  return (
    <div
      ref={controlRef}
      onKeyDown={onControlKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.s,
        maxInlineSize: maxWidth,
      }}
    >
      <EuiFormControlLayout
        compressed={compressed}
        isInvalid={isInvalid}
        clear={isEditing && text !== '' ? { onClick: onInputClear } : undefined}
      >
        {isEditing ? (
          <EuiFieldText
            data-test-subj="dateRangePickerInput"
            role="combobox"
            aria-expanded={isEditing}
            aria-controls={panelId}
            aria-haspopup="dialog"
            autoFocus
            inputRef={inputRef}
            controlOnly
            value={text}
            isInvalid={isInvalid}
            onChange={onInputChange}
            onKeyDown={onInputKeyDown}
            compressed={compressed}
          />
        ) : (
          <EuiFormControlButton
            data-test-subj="dateRangePickerControlButton"
            buttonRef={buttonRef}
            value={displayText}
            onClick={onButtonClick}
            isInvalid={isInvalid}
            compressed={compressed}
          >
            {displayDuration && <EuiBadge>{displayDuration}</EuiBadge>}
          </EuiFormControlButton>
        )}
      </EuiFormControlLayout>
    </div>
  );
}

/**
 * Resolve the `initialFocus` target within the panel.
 * A string is treated as a CSS selector; a ref as a direct element handle.
 * Falls back to the panel div itself when unset.
 *
 * TODO move to utils.ts
 */
function resolveInitialFocus(
  panelRef: React.RefObject<HTMLDivElement>,
  initialFocus?: InitialFocus
): HTMLElement | null {
  if (typeof initialFocus === 'string') {
    return panelRef.current?.querySelector<HTMLElement>(initialFocus) ?? null;
  }
  if (initialFocus && 'current' in initialFocus) {
    return initialFocus.current;
  }
  return panelRef.current;
}
