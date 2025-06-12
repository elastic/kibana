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
  EuiFormControlLayout,
  EuiFormLabel,
  EuiSuperSelect,
  EuiHealth,
  EuiDualRange,
  EuiDualRangeProps,
} from '@elastic/eui';
import { css } from '@emotion/react';

export const RangeSlider = () => {
  const levels = [
    {
      min: 0,
      max: 20,
      color: 'danger',
    },
    {
      min: 20,
      max: 100,
      color: 'success',
    },
  ];
  const [dualValue, setDualValue] = useState<EuiDualRangeProps['value']>([20, 100]);

  return (
    <EuiFormControlLayout
      compressed
      prepend={<EuiFormLabel htmlFor={'someId'}>Label</EuiFormLabel>}
    >
      <span
        css={css`
          .euiFormControlLayout {
            border: none;
          }
        `}
      >
        <EuiDualRange
          compressed
          id={'dualInputRangeSlider'}
          min={0}
          max={100}
          value={dualValue}
          onChange={(value) => setDualValue(value)}
          showInput="inputWithPopover"
          showLabels
          levels={levels}
          aria-label="An example of EuiDualRange with showInput prop"
        />
      </span>
    </EuiFormControlLayout>
  );
};
