/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { EuiTextArea } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { NL_TEXTAREA_MAX_HEIGHT } from './visor.styles';

const PLACEHOLDER_TYPE_INTERVAL_MS = 32;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const useTypedText = (text: string, enabled: boolean): string => {
  const [count, setCount] = useState(0);
  const isTyping = enabled && !prefersReducedMotion();

  useEffect(() => {
    if (!isTyping) {
      return;
    }
    setCount(0);
    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current + 1 >= text.length) {
          window.clearInterval(timer);
        }
        return current + 1;
      });
    }, PLACEHOLDER_TYPE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [text, isTyping]);

  return isTyping ? text.slice(0, count) : text;
};

interface NLInputProps {
  value: string;
  placeholder: string;
  /** Types the placeholder once. Later visits should pass false. */
  animatePlaceholder?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputStyles: SerializedStyles;
}

export function NLInput({
  value,
  placeholder,
  animatePlaceholder = false,
  disabled,
  onChange,
  onSubmit,
  inputStyles,
}: NLInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typedPlaceholder = useTypedText(placeholder, animatePlaceholder);

  const updateHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.overflow = 'auto';
    textarea.style.maxHeight = NL_TEXTAREA_MAX_HEIGHT;
    textarea.style.setProperty('height', 'auto', 'important');
    textarea.style.setProperty('height', `${textarea.scrollHeight}px`, 'important');
  }, []);

  const resetHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.removeProperty('white-space');
    textarea.style.removeProperty('overflow');
    textarea.style.removeProperty('max-height');
    textarea.style.removeProperty('height');
  }, []);

  return (
    <div css={inputStyles}>
      <EuiTextArea
        inputRef={textareaRef}
        compressed
        fullWidth
        resize="none"
        rows={1}
        placeholder={typedPlaceholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          updateHeight();
        }}
        onFocus={updateHeight}
        onBlur={resetHeight}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        data-test-subj="esqlVisorNLQueryInput"
      />
    </div>
  );
}
