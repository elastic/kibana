/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFieldNumber, EuiFieldNumberProps } from '@elastic/eui';

import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

/**
 * Props for a {@link NumberInput} component.
 */
export type NumberInputProps = InputProps<'number'>;

/**
 * Component for manipulating a `number` field.
 */
export const NumberInput = ({
  field,
  unsavedChange,
  isSavingEnabled,
  onInputChange,
}: NumberInputProps) => {
  const onChange: EuiFieldNumberProps['onChange'] = (event) => {
    const inputValue = Number(event.target.value);
    onUpdate({ type: field.type, unsavedValue: inputValue });
  };

  const onUpdate = useUpdate({ onInputChange, field });

  const { id, name, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;
  const [rawValue] = getFieldInputValue(field, unsavedChange);

  const value = rawValue === null ? undefined : rawValue;

  return (
    <EuiFieldNumber
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      fullWidth
      disabled={!isSavingEnabled}
      {...{ name, value, onChange }}
    />
  );
};
