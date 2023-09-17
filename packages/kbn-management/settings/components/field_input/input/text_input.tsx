/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFieldText } from '@elastic/eui';

import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

/**
 * Props for a {@link TextInput} component.
 */
export type TextInputProps = InputProps<'string'>;

/**
 * Component for manipulating a `string` field.
 */
export const TextInput = ({
  name,
  onChange: onChangeProp,
  ariaLabel,
  id,
  isDisabled = false,
  value: valueProp,
  ariaDescribedBy,
}: TextInputProps) => {
  const value = valueProp || '';
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChangeProp({ value: event.target.value });

  return (
    <EuiFieldText
      fullWidth
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...{ name, onChange, value }}
    />
  );
};
