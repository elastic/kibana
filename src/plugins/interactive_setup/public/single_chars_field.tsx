/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FunctionComponent, ReactNode } from 'react';
import React, { useEffect, useRef } from 'react';
import useList from 'react-use/lib/useList';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

export interface SingleCharsFieldProps {
  defaultValue: string;
  length: number;
  separator?: number;
  pattern?: RegExp;
  onChange(value: string): void;
  isInvalid?: boolean;
  autoFocus?: boolean;
}

export const SingleCharsField: FunctionComponent<SingleCharsFieldProps> = ({
  defaultValue,
  length,
  separator,
  pattern = /^[0-9]$/,
  onChange,
  isInvalid,
  autoFocus = false,
}) => {
  // Strip any invalid characters from input or clipboard and restrict length.
  const sanitize = (str: string) => {
    return str
      .split('')
      .filter((char) => char.match(pattern))
      .join('')
      .substr(0, length);
  };

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [chars, { set, updateAt }] = useList(sanitize(defaultValue).split(''));

  const focusField = (i: number) => {
    const input = inputRefs.current[i];
    if (input) {
      input.focus();
    }
  };

  // Trigger `onChange` callback when characters change
  useUpdateEffect(() => {
    onChange(chars.join(''));
  }, [chars]);

  // Focus first field on initial render
  useEffect(() => {
    if (autoFocus) {
      focusField(0);
    }
  }, [autoFocus]);

  const children: ReactNode[] = [];
  for (let i = 0; i < length; i++) {
    if (separator && i !== 0 && i % separator === 0) {
      children.push(
        <EuiFlexItem
          key={`${i}separator`}
          grow={false}
          style={{ width: parseInt(euiThemeVars.euiFormControlHeight, 10) / 8 }}
        />
      );
    }

    children.push(
      <EuiFlexItem key={i} grow={false} style={{ width: euiThemeVars.euiFormControlHeight }}>
        <EuiFieldText
          inputRef={(el) => {
            inputRefs.current[i] = el;
          }}
          value={chars[i] ?? ''}
          onChange={(event) => {
            // Ensure event doesn't bubble up since we manage our own `onChange` event
            event.stopPropagation();
          }}
          onInput={(event) => {
            // Ignore input if invalid character was entered (unless empty)
            if (event.currentTarget.value !== '' && sanitize(event.currentTarget.value) === '') {
              return event.preventDefault();
            }
            updateAt(i, event.currentTarget.value);
            // Do not focus the next field if value is empty (e.g. when hitting backspace)
            if (event.currentTarget.value) {
              focusField(i + 1);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace') {
              // Clear previous field if current field is already empty
              if (event.currentTarget.value === '') {
                updateAt(i - 1, event.currentTarget.value);
                focusField(i - 1);
              }
            } else if (event.key === 'ArrowLeft') {
              focusField(i - 1);
            } else if (event.key === 'ArrowRight') {
              focusField(i + 1);
            }
          }}
          onPaste={(event) => {
            const text = sanitize(event.clipboardData.getData('text'));
            set(text.split(''));
            focusField(Math.min(text.length, length - 1));
            event.preventDefault();
          }}
          onFocus={(event) => {
            const input = event.currentTarget;
            setTimeout(() => input.select(), 0);
          }}
          maxLength={1}
          isInvalid={isInvalid}
          style={{ textAlign: 'center' }}
          aria-label={i18n.translate('interactiveSetup.singleCharsField.digitLabel', {
            defaultMessage: 'Digit {index}',
            values: { index: i + 1 },
          })}
        />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup responsive={false} alignItems="center" justifyContent="center" gutterSize="s">
      {children}
    </EuiFlexGroup>
  );
};
