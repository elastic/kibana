/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiFieldText } from '@elastic/eui';

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
  id,
  name,
  onChange: onChangeProp,
  ariaLabel,
  isDisabled = false,
  value: valueProp,
  ariaDescribedBy,
}: ArrayInputProps) => {
  const [value, setValue] = useState(valueProp?.join(', '));

  useEffect(() => {
    setValue(valueProp?.join(', '));
  }, [valueProp]);

  // In the past, each keypress would invoke the `onChange` callback.  This
  // is likely wasteful, so we've switched it to `onBlur` instead.
  const onBlur = (event: React.ChangeEvent<HTMLInputElement>) => {
    const blurValue = event.target.value
      .replace(REGEX, ',')
      .split(',')
      .filter((v) => v !== '');
    onChangeProp({ value: blurValue });
    setValue(blurValue.join(', '));
  };

  return (
    <EuiFieldText
      fullWidth
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onChange={(event) => setValue(event.target.value)}
      {...{ name, onBlur, value }}
    />
  );
};
