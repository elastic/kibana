/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, ForwardRefExoticComponent, RefAttributes } from 'react';
import { EuiFieldText, EuiFieldNumber } from '@elastic/eui';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';

export interface ValueInputProps {
  onError?: (error: string | null) => void;
  value: string;
  label?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  className?: string;
  isInvalid?: boolean;
  placeholder?: string;
}

export const StringInput = React.forwardRef<HTMLInputElement, ValueInputProps>(
  ({ onError, ...restOfProps }, ref) => (
    <EuiFieldText compressed {...restOfProps} autoFocus inputRef={ref} />
  )
);

export const NumberInput = React.forwardRef<HTMLInputElement, ValueInputProps>(
  ({ onError, ...restOfProps }, ref) => (
    <EuiFieldNumber compressed {...restOfProps} inputRef={ref} />
  )
);

export const BooleanInput = React.forwardRef<HTMLInputElement, ValueInputProps>(
  ({ onError, onChange, ...restOfProps }, ref) => {
    const [error, setError] = React.useState<string | null>(null);

    const onChangeHandler = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!['true', 'false'].includes(e.target.value.toLowerCase())) {
          const booleanError = i18n.translate('indexEditor.cellValueInput.validation.boolean', {
            defaultMessage: 'Value must be true or false',
          });
          setError(booleanError);
          onError?.(booleanError);
        } else {
          setError(null);
          onError?.(null);
        }
        onChange?.(e);
      },
      [onError, onChange]
    );

    return (
      <EuiFieldText
        compressed
        {...restOfProps}
        onChange={onChangeHandler}
        isInvalid={!!error}
        inputRef={ref}
      />
    );
  }
);

export function getInputComponentForType(
  type: DatatableColumnType | undefined
): ForwardRefExoticComponent<ValueInputProps & RefAttributes<HTMLInputElement>> {
  switch (type) {
    case 'number':
      return NumberInput;
    case 'boolean':
      return BooleanInput;
    default:
      return StringInput;
  }
}
