/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';

import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

import { useServices } from '../services';
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
  const [inputValue] = getFieldInputValue(field, unsavedChange);
  const [value, setValue] = useState(inputValue);
  const { validateChange } = useServices();

  const onChange: EuiFieldTextProps['onChange'] = async (event) => setValue(event.target.value);

  const onUpdate = useUpdate({ onInputChange, field });

  useEffect(() => {
    setValue(inputValue);
  }, [inputValue]);

  // In the past, each keypress would invoke the `onChange` callback.  This
  // is likely wasteful, so we've switched it to `onBlur` instead.
  const onBlur = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const blurValue = event.target.value;
    const error = await validateChange(field.id, blurValue);
    onUpdate({ type: field.type, unsavedValue: blurValue, isInvalid: !!error, error });
    setValue(blurValue);
  };

  const { id, name, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;

  return (
    <EuiFieldText
      fullWidth
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={!isSavingEnabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...{ name, onBlur, onChange, value }}
    />
  );
};
