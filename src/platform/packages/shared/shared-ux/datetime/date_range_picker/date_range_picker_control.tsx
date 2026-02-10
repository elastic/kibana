/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type KeyboardEvent, type ChangeEvent } from 'react';

import {
  EuiBadge,
  EuiFieldText,
  EuiFormControlButton,
  EuiFormControlLayout,
  useEuiTheme,
} from '@elastic/eui';

import { useDateRangePickerContext } from './date_range_picker_context';

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
  } = useDateRangePickerContext();
  const { euiTheme } = useEuiTheme();

  const onButtonClick = () => {
    setIsEditing(true);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const onInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && isEditing && text) {
      applyRange();
    }
    if (event.key === 'Escape' && isEditing) {
      setIsEditing(false);
    }
  };

  const onInputClear = () => {
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div
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
