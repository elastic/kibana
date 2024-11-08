/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { css } from '@emotion/react';
import { copyStyles } from './helpers';

const blockCss = css({
  display: 'inline-block',
  position: 'relative',
  width: '100%',
});

const inputCss = css({
  display: 'inline-block',
  verticalAlign: 'bottom',
  boxSizing: 'border-box',
  overflow: 'hidden',
  padding: 0,
  margin: 0,
  background: 0,
  outline: '0 !important',
  border: 0,
  color: 'inherit',
  fontWeight: 'inherit',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  lineHeight: 'inherit',
  whiteSpace: 'pre',
  resize: 'none',
});

const sizerCss = css({
  display: 'inline-block',
  position: 'absolute',
  pointerEvents: 'none',
  userSelect: 'none',
  boxSizing: 'border-box',
  top: 0,
  left: 0,
  border: 0,
  whiteSpace: 'pre',
});

export interface FlexibleInputProps {
  /** The string to display and edit. */
  value: string;

  /** Ref to the input element. */
  inp?: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;

  /** Whether the input is multiline. */
  multiline?: boolean;

  /** Whether to wrap text to a new line when it exceeds the length of current. */
  wrap?: boolean;

  /**
   * Whether the input should take the full width of the parent, even when there
   * is not enough text to do that naturally with content.
   */
  fullWidth?: boolean;

  /** Typeahead string to add to the value. It is visible at half opacity. */
  typeahead?: string;

  /** Addition width to add, for example, to account for number stepper. */
  extraWidth?: number;

  /** Minimum width to allow. */
  minWidth?: number;

  /** Maximum width to allow. */
  maxWidth?: number;

  /** Whether the input is focused on initial render. */
  focus?: boolean;

  /** Callback for when the input value changes. */
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;

  /** Callback for when the input is focused. */
  onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;

  /** Callback for when the input is blurred. */
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;

  /** Callback for when a key is pressed. */
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;

  /** Callback for when the Enter key is pressed. */
  onSubmit?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;

  /** Callback for when the Escape key is pressed. */
  onCancel?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;

  /** Callback for when the Tab key is pressed. */
  onTab?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export const FlexibleInput: React.FC<FlexibleInputProps> = ({
  value,
  inp,
  multiline,
  wrap,
  fullWidth,
  typeahead = '',
  extraWidth,
  minWidth = 8,
  maxWidth,
  focus,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onSubmit,
  onCancel,
  onTab,
}) => {
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const sizerRef = React.useRef<HTMLSpanElement>(null);
  const sizerValueRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    if (!inputRef.current || !sizerRef.current) return;
    if (focus) inputRef.current.focus();
    copyStyles(inputRef.current, sizerRef.current!, [
      'font',
      'fontSize',
      'fontFamily',
      'fontWeight',
      'fontStyle',
      'letterSpacing',
      'textTransform',
      'boxSizing',
    ]);
  }, [focus]);

  React.useLayoutEffect(() => {
    const sizerValue = sizerValueRef.current;
    if (sizerValue) sizerValue.textContent = value;
    const input = inputRef.current;
    const sizer = sizerRef.current;
    if (!input || !sizer) return;
    let width = sizer.scrollWidth;
    if (extraWidth) width += extraWidth;
    if (minWidth) width = Math.max(width, minWidth);
    if (maxWidth) width = Math.min(width, maxWidth);
    const style = input.style;
    style.width = width + 'px';
    if (multiline) {
      const height = sizer.scrollHeight;
      style.height = height + 'px';
    }
  }, [value, extraWidth, minWidth, maxWidth, multiline]);

  const attr: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> & { ref: any } = {
    ref: (input: unknown) => {
      (inputRef as any).current = input;
      if (inp) inp(input as HTMLInputElement | HTMLTextAreaElement);
    },
    value,
    style: {
      width: fullWidth ? '100%' : undefined,
      whiteSpace: wrap ? 'pre-wrap' : 'pre',
      display: fullWidth ? 'block' : 'inline-block',
    },
    onChange: (e) => {
      if (onChange) onChange(e);
    },
    onFocus,
    onBlur,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (!multiline || e.ctrlKey)) {
        if (onSubmit) onSubmit(e as any);
      } else if (e.key === 'Escape') {
        if (onCancel) onCancel(e as any);
      } else if (e.key === 'Tab') {
        if (onTab) onTab(e as any);
      }
      if (onKeyDown) onKeyDown(e as any);
    },
  };

  const input = multiline ? (
    <textarea css={inputCss} {...attr} />
  ) : (
    <input css={inputCss} {...attr} />
  );

  const style: React.CSSProperties = {
    display: fullWidth ? 'block' : 'inline-block',
    width: fullWidth ? '100%' : undefined,
    overflowX: fullWidth ? 'auto' : undefined,
    whiteSpace: wrap ? 'pre-wrap' : 'pre',
  };

  return (
    <span css={blockCss} style={style}>
      {input}
      <span
        ref={sizerRef}
        css={sizerCss}
        style={{ width: fullWidth ? '100%' : undefined, whiteSpace: wrap ? 'pre-wrap' : 'pre' }}
      >
        <span ref={sizerValueRef} style={{ visibility: 'hidden' }} />
        {'\u200b'}
        {!!typeahead && <span style={{ opacity: 0.7 }}>{typeahead}</span>}
      </span>
    </span>
  );
};
