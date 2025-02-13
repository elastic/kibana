/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';

import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

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
  field,
  unsavedChange,
  isSavingEnabled,
  onInputChange,
}: TextInputProps) => {
  const onChange: EuiFieldTextProps['onChange'] = (event) => {
    const inputValue = event.target.value;
    onUpdate({ type: field.type, unsavedValue: inputValue });
  };

  const onUpdate = useUpdate({ onInputChange, field });

  const { id, name, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;
  const [value] = getFieldInputValue(field, unsavedChange);

  return (
    <EuiFieldText
      fullWidth
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={!isSavingEnabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...{ name, onChange, value }}
    />
  );
};
