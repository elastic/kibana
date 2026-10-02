/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { EuiTextArea, makeHighContrastColor, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';
import { NL_TEXTAREA_MAX_HEIGHT } from './visor.styles';

const PLACEHOLDER_TYPE_INTERVAL_MS = 32;

const prefersReducedMotion = (): boolean => {
  if (typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const { euiTheme, highContrastMode } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');
  // Same color EuiTextArea applies to ::placeholder.
  const placeholderColor = highContrastMode
    ? makeHighContrastColor(euiTheme.components.forms.colorDisabled)(euiTheme.colors.emptyShade)
    : euiTheme.components.forms.colorDisabled;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [typedCount, setTypedCount] = useState(0);
  const [isTypingPlaceholder, setIsTypingPlaceholder] = useState(false);

  useEffect(() => {
    if (!animatePlaceholder || prefersReducedMotion()) {
      return;
    }

    setTypedCount(0);
    setIsTypingPlaceholder(true);
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setTypedCount(count);
      if (count >= placeholder.length) {
        window.clearInterval(timer);
        setIsTypingPlaceholder(false);
      }
    }, PLACEHOLDER_TYPE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [animatePlaceholder, placeholder]);

  const stopPlaceholderTyping = useCallback(() => {
    setIsTypingPlaceholder(false);
  }, []);

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

  const showTypedPlaceholder = isTypingPlaceholder && value.length === 0;
  const typedPlaceholderStyles = css`
    position: relative;

    .euiTextArea::placeholder {
      color: transparent;
    }
  `;
  const typedPlaceholderOverlayStyles = css`
    position: absolute;
    z-index: ${euiTheme.levels.content};
    inset: 0;
    display: flex;
    align-items: flex-start;
    padding-block-start: ${euiTheme.size.xxs};
    padding-inline: ${euiTheme.size.s};
    color: ${placeholderColor};
    font-size: ${fontSize};
    line-height: calc(${euiTheme.size.xl} - (${euiTheme.border.width.thin} * 2));
    pointer-events: none;
    user-select: none;
    white-space: pre;
  `;

  return (
    <div css={[inputStyles, showTypedPlaceholder && typedPlaceholderStyles]}>
      <EuiTextArea
        inputRef={textareaRef}
        compressed
        fullWidth
        resize="none"
        rows={1}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          stopPlaceholderTyping();
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
      {showTypedPlaceholder && (
        <span
          css={typedPlaceholderOverlayStyles}
          aria-hidden="true"
          data-test-subj="esqlVisorNLPlaceholder"
        >
          {placeholder.slice(0, typedCount)}
        </span>
      )}
    </div>
  );
}
