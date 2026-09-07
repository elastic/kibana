/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFieldText, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES, getKbnFieldType } from '@kbn/field-types';

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

export const StringInput = ({ onError, ...restOfProps }: ValueInputProps) => (
  <EuiFieldText compressed {...restOfProps} autoFocus />
);

export const NumberInput = ({ onError, ...restOfProps }: ValueInputProps) => (
  <EuiFieldNumber compressed {...restOfProps} />
);

export const BooleanInput = ({ onError, onChange, ...restOfProps }: ValueInputProps) => {
  const [error, setError] = React.useState<string | null>(null);

  const onChangeHandler = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!['true', 'false'].includes(e.target.value.trim().toLowerCase())) {
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
    <EuiFieldText compressed {...restOfProps} onChange={onChangeHandler} isInvalid={!!error} />
  );
};

export function getInputComponentForType(type: string | undefined): React.FC<ValueInputProps> {
  if (!type) {
    return StringInput;
  }

  const kibanaFieldType = getKbnFieldType(type);

  switch (kibanaFieldType.name) {
    case KBN_FIELD_TYPES.NUMBER:
      return NumberInput;
    case KBN_FIELD_TYPES.BOOLEAN:
      return BooleanInput;
    default:
      return StringInput;
  }
}
