/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';

import { getFieldInputValue } from '@kbn/management-settings-utilities';
import { useUpdate } from '@kbn/management-settings-utilities';

import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

/**
 * Props for an {@link ArrayFieldInput} component.
 */
export type ArrayInputProps = InputProps<'array'>;

const REGEX = /,\s+/g;

/**
 * Component for manipulating an `array` field.
 */
export const ArrayInput = ({
  field,
  unsavedChange,
  isSavingEnabled,
  onInputChange,
}: ArrayInputProps) => {
  const [inputValue] = getFieldInputValue(field, unsavedChange) || [];
  const [value, setValue] = useState(inputValue?.join(', '));

  const onChange: EuiFieldTextProps['onChange'] = (event) => {
    const newValue = event.target.value;
    setValue(newValue);
  };

  const onUpdate = useUpdate({ onInputChange, field });

  useEffect(() => {
    setValue(inputValue?.join(', '));
  }, [inputValue]);

  // In the past, each keypress would invoke the `onChange` callback.  This
  // is likely wasteful, so we've switched it to `onBlur` instead.
  const onBlur = (event: React.ChangeEvent<HTMLInputElement>) => {
    const blurValue = event.target.value
      .replace(REGEX, ',')
      .split(',')
      .filter((v) => v !== '');
    onUpdate({ type: field.type, unsavedValue: blurValue });
    setValue(blurValue.join(', '));
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
