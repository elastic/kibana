/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiSuperSelect,
} from '@elastic/eui';
import { css } from '@emotion/react';

export const OptionsList = ({ controlSize }: { controlSize: 'normal' | 'compressed' }) => {
  const options = [
    {
      value: 'warning',
      inputDisplay: <>Some other option</>,
      'data-test-subj': 'option-warning',
    },
    {
      value: 'minor',
      inputDisplay: <>Any</>,
      'data-test-subj': 'option-minor',
    },
    {
      value: 'critical',
      inputDisplay: <>A different option</>,
      'data-test-subj': 'option-critical',
    },
  ];
  const [value, setValue] = useState(options[1].value);

  const onChange = (value) => {
    setValue(value);
  };

  return controlSize === 'compressed' ? (
    <EuiFilterGroup
      compressed
      fullWidth
      css={css`
        width: 100%;
      `}
    >
      <EuiFilterButton
        grow
        iconSize={'s'}
        iconType="arrowDown"
        badgeColor="subdued"
        onClick={() => {}}
        numActiveFilters={Math.floor(Math.random() * 11)}
      >
        Label
      </EuiFilterButton>
    </EuiFilterGroup>
  ) : (
    <EuiFormControlLayout
      compressed
      css={css`
        min-width: 224px;
        flex-grow: 1;
        max-inline-size: none;
        inline-size: auto;
        .euiFormControlLayout {
          z-index: 1; // allows border to darken on hover to match range slider behaviour
        }
      `}
      prepend={<EuiFormLabel htmlFor={'someId'}>Label</EuiFormLabel>}
    >
      <EuiSuperSelect
        compressed
        fullWidth
        options={options}
        valueOfSelected={value}
        onChange={(value) => onChange(value)}
        css={css`
          border-top-left-radius: 0px;
          border-bottom-left-radius: 0px;
        `}
      />
    </EuiFormControlLayout>
  );
};
