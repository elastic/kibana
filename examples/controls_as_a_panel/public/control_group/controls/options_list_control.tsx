/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiFormControlLayout, EuiFormLabel, EuiSuperSelect, EuiHealth } from '@elastic/eui';
import { css } from '@emotion/react';

export const OptionsList = () => {
  const options = [
    {
      value: 'warning',
      inputDisplay: (
        <EuiHealth color="subdued" style={{ lineHeight: 'inherit' }}>
          Warning
        </EuiHealth>
      ),
      'data-test-subj': 'option-warning',
      disabled: true,
    },
    {
      value: 'minor',
      inputDisplay: (
        <EuiHealth color="warning" style={{ lineHeight: 'inherit' }}>
          Minor
        </EuiHealth>
      ),
      'data-test-subj': 'option-minor',
    },
    {
      value: 'critical',
      inputDisplay: (
        <EuiHealth color="danger" style={{ lineHeight: 'inherit' }}>
          Critical
        </EuiHealth>
      ),
      'data-test-subj': 'option-critical',
    },
  ];
  const [value, setValue] = useState(options[1].value);

  const onChange = (value) => {
    setValue(value);
  };

  return (
    <EuiFormControlLayout
      compressed
      prepend={<EuiFormLabel htmlFor={'someId'}>Label</EuiFormLabel>}
    >
      <EuiSuperSelect
        compressed
        options={options}
        valueOfSelected={value}
        onChange={(value) => onChange(value)}
        css={css`
          box-shadow: none;
        `}
      />
    </EuiFormControlLayout>
  );
};
