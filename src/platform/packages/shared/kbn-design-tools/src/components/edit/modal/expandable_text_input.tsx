/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';
import { EuiFieldText, EuiPopover, EuiTextArea } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { isEscapeKey } from '../../../lib/keyboard_shortcuts';

const popoverPanelCss = css({ minWidth: 496 });

const textAreaCss = css({ minWidth: 480 });

/**
 * Override the readOnly visual treatment so the trigger field looks like a
 * normal editable input. EUI applies a muted background and default cursor
 * for readOnly inputs — we undo that here so it feels interactive.
 */
const readOnlyResetCss = css`
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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    onFocus?.();
    requestAnimationFrame(() => {
      textAreaRef.current?.focus();
    });
  }, [onFocus]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <EuiPopover
      button={
        <div className={readOnlyResetCss}>
          <EuiFieldText
            value={value}
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
      panelClassName={popoverPanelCss}
      aria-label={i18n.translate('kbnDesignTools.expandableTextInput.ariaLabel', {
        defaultMessage: 'Expand text input',
      })}
    >
      <EuiTextArea
        inputRef={(el) => {
          (textAreaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        }}
        className={textAreaCss}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
