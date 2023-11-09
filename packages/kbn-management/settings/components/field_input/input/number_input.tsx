/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiFieldNumber, EuiFieldNumberProps } from '@elastic/eui';

import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { useServices } from '../services';

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
  const [inputValue] = getFieldInputValue(field, unsavedChange) || undefined;
  const [value, setValue] = useState(inputValue);
  const { validateChange } = useServices();

  const onChange: EuiFieldNumberProps['onChange'] = async (event) => {
    const newValue = Number(event.target.value);
    setValue(newValue);
  };

  const onUpdate = useUpdate({ onInputChange, field });

  useEffect(() => {
    setValue(inputValue);
  }, [inputValue]);

  // In the past, each keypress would invoke the `onChange` callback.  This
  // is likely wasteful, so we've switched it to `onBlur` instead.
  const onBlur = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const blurValue = Number(event.target.value);
    const validationResponse = await validateChange(field.id, blurValue);
    if (validationResponse.successfulValidation) {
      onUpdate({
        type: field.type,
        unsavedValue: blurValue,
        isInvalid: !validationResponse.valid,
        error: validationResponse.errorMessage,
      });
    } else {
      onUpdate({ type: field.type, unsavedValue: blurValue });
    }
    setValue(blurValue);
  };

  const { id, name, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;

  return (
    <EuiFieldNumber
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      fullWidth
      disabled={!isSavingEnabled}
      {...{ name, value, onBlur, onChange }}
    />
  );
};
