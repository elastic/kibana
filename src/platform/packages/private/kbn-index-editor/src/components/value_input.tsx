/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldText } from '@elastic/eui';
import React, { useState } from 'react';

interface ValueInputProps {
  value?: string;
  placeholder?: string;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onEnter?: (value: string) => void;
  onChange?: (value: string) => void;
}

export const ValueInput = ({
  value = '',
  placeholder = '',
  onBlur,
  onEnter,
  onChange,
}: ValueInputProps) => {
  const [editValue, setEditValue] = useState(value);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Perform Validations
      onEnter?.(editValue);
    }
  };

  const onBlurHandler = (event: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      onBlur(event);
    }
    // Perform Validations ?
  };

  return (
    <EuiFieldText
      name="test123"
      autoFocus
      compressed
      placeholder={placeholder}
      value={editValue}
      aria-label="Use aria labels when no actual label is in use"
      onChange={(e) => {
        setEditValue(e.target.value);
        onChange?.(e.target.value);
      }}
      onBlur={onBlurHandler}
      onKeyDown={onKeyDown}
    />
  );
};
