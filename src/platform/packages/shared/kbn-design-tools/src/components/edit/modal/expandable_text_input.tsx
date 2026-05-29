/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiFieldText, EuiPopover, EuiTextArea } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isEscapeKey } from '../../../lib/keyboard_shortcuts';

const DEBOUNCE_MS = 300;

const textAreaCss = css({ minWidth: 480 });

/**
 * Override the readOnly visual treatment so the trigger field looks like a
 * normal editable input. EUI applies a muted background and default cursor
 * for readOnly inputs - we undo that here so it feels interactive.
 */
const readOnlyResetCss = css`
  width: 344px;

  /* Reset the wrapper (EuiFormControlLayout) background */
  .euiFormControlLayout {
    background-color: inherit;
  }

  input[readOnly] {
    cursor: pointer;
    background-color: inherit;
    text-overflow: ellipsis;
  }
`;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  rows?: number;
  placeholder?: string;
}

export const ExpandableTextInput = ({ value, onChange, onFocus, rows = 4, placeholder }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync from parent when the external value changes (e.g. undo/redo)
  // and flush any pending debounced change on unmount.
  useEffect(() => {
    setLocalValue(value);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(newValue);
      }, DEBOUNCE_MS);
    },
    [onChange]
  );

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    onFocus?.();
    requestAnimationFrame(() => {
      textAreaRef.current?.focus();
    });
  }, [onFocus]);

  const handleClose = useCallback(() => {
    // Flush pending change immediately on close
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
      onChange(localValue);
    }
    setIsOpen(false);
  }, [onChange, localValue]);

  return (
    <EuiPopover
      button={
        <div css={readOnlyResetCss}>
          <EuiFieldText
            value={localValue}
            onFocus={handleOpen}
            compressed
            placeholder={placeholder}
            readOnly
          />
        </div>
      }
      isOpen={isOpen}
      closePopover={handleClose}
      panelPaddingSize="s"
      anchorPosition="downLeft"
      panelStyle={{ minWidth: 496 }}
      aria-label={i18n.translate('kbnDesignTools.edit.modal.expandableTextInput.ariaLabel', {
        defaultMessage: 'Expand text input',
      })}
    >
      <EuiTextArea
        inputRef={(el) => {
          textAreaRef.current = el;
        }}
        css={textAreaCss}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (isEscapeKey(e.nativeEvent)) {
            e.stopPropagation();
            handleClose();
          }
        }}
        rows={rows}
        compressed
        resize="vertical"
        placeholder={placeholder}
      />
    </EuiPopover>
  );
};
