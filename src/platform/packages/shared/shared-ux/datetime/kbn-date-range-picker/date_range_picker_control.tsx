/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type KeyboardEvent, type ChangeEvent, useRef, useEffect, useCallback } from 'react';

import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFieldText,
  EuiFormControlButton,
  EuiFormControlLayout,
  EuiToolTip,
  keys,
  useEuiTheme,
} from '@elastic/eui';

import { FOCUSABLE_SELECTOR } from './constants';
import { resolveInitialFocus } from './utils';
import { useDateRangePickerContext } from './date_range_picker_context';
import { TimeWindowButtons } from './date_range_picker_time_window_buttons';
import { useSelectTextPartsWithArrowKeys } from './hooks/use_select_text_parts_with_arrow_keys';
import { useInputHintText } from './hooks/use_input_hint_text';

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
    displayFullFormattedText,
    displayShortDuration,
    inputRef,
    buttonRef,
    panelRef,
    panelId,
    initialFocus,
    timeWindowButtonsConfig,
  } = useDateRangePickerContext();
  const { euiTheme } = useEuiTheme();
  const hintText = useInputHintText(text);

  const controlRef = useRef<HTMLDivElement>(null);
  const wasEditingRef = useRef(false);

  /** Focus the button when transitioning from editing to idle. */
  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      buttonRef.current?.focus();
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, buttonRef]);

  useSelectTextPartsWithArrowKeys({
    inputRef,
    isActive: isEditing,
    // TODO this is simply increasing/decreasing integers,
    // ideally we could make this "smart" so it knows what's being modified e.g. day of the month
    onModifyPart: ({ text: currentText, part, action }) => {
      const value = parseInt(part.text, 10);
      if (isNaN(value)) return undefined;
      const nextValue = action === 'increase' ? value + 1 : value - 1;
      const newText =
        currentText.substring(0, part.start) + String(nextValue) + currentText.substring(part.end);
      setText(newText);
      return newText;
    },
  });

  const onButtonClick = () => {
    setIsEditing(true);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const onInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === keys.ENTER && isEditing && text) {
      // Prevent Enter's keyup firing `onButtonClick`
      event.preventDefault();
      applyRange();
    }
    if (event.key === keys.ESCAPE && isEditing) {
      setIsEditing(false);
    }
    if (event.key === keys.ARROW_DOWN && isEditing) {
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
      if (event.key !== keys.TAB || !isEditing) return;

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

  const containerStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    max-inline-size: ${maxWidth};
  `;

  const tooltipStyles = css`
    max-inline-size: min(58ch, 90vw);
  `;

  return (
    <div css={containerStyles} ref={controlRef} onKeyDown={onControlKeyDown}>
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
            placeholder={hintText}
          />
        ) : (
          <EuiToolTip
            content={
              displayFullFormattedText !== displayText ? displayFullFormattedText : undefined
            }
            display="block"
            css={tooltipStyles}
            offset={euiTheme.base * 0.75}
          >
            <EuiFormControlButton
              data-test-subj="dateRangePickerControlButton"
              buttonRef={buttonRef}
              value={displayText}
              onClick={onButtonClick}
              isInvalid={isInvalid}
              compressed={compressed}
            >
              {displayShortDuration && <EuiBadge>{displayShortDuration}</EuiBadge>}
            </EuiFormControlButton>
          </EuiToolTip>
        )}
      </EuiFormControlLayout>
      {timeWindowButtonsConfig && <TimeWindowButtons config={timeWindowButtonsConfig} />}
    </div>
  );
}
