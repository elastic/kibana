/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';
import { useDebouncedValue } from './debounced_value';

type Props = {
  value: string;
  onChange: (value: string) => void;
  defaultValue?: string;
  allowFalsyValue?: boolean;
} & Omit<EuiFieldTextProps, 'value' | 'onChange' | 'defaultValue'>;

const DebouncedInputHelper = ({
  onChange,
  value,
  defaultValue,
  allowFalsyValue,
  ...rest
}: Props) => {
  const { inputValue, handleInputChange, initialValue } = useDebouncedValue(
    {
      onChange,
      value,
      defaultValue,
    },
    { allowFalsyValue }
  );

  return (
    <EuiFieldText
      {...rest}
      value={inputValue}
      onChange={(e) => {
        handleInputChange(e.target.value);
      }}
      placeholder={initialValue}
    />
  );
};

/**
 * When testing this component, mock the "debounce" function in lodash (see this module test for an example)
 */
export const DebouncedInput = (props: Props) => (
  // need this extra layer to force a rerender whenever the default value changes.
  // this is because we need a new initialValue to be computed from the debounce hook.
  <DebouncedInputHelper {...props} key={props.defaultValue} />
);
