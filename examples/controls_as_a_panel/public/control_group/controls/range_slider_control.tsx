/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiDualRange,
  EuiDualRangeProps,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiNotificationBadge,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';

export const RangeSlider = ({ controlSize }: { controlSize: 'normal' | 'compressed' }) => {
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

  return controlSize === 'compressed' ? (
    <EuiFilterGroup
      compressed
      fullWidth
      css={css`
        width: 100%;
      `}
    >
      <EuiFilterButton
        iconType="arrowDown"
        badgeColor="success"
        onClick={() => {}}
        grow
        iconSize={'s'}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>Label</EuiFlexItem>
          <EuiFlexItem>
            <EuiNotificationBadge color="subdued">1 -{'>'} 2</EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
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
          border: none;
          border-top-left-radius: 0px;
          border-bottom-left-radius: 0px;
          input {
            min-inline-size: auto;
          }
        }
      `}
      prepend={<EuiFormLabel htmlFor={'someId'}>Label</EuiFormLabel>}
    >
      <EuiDualRange
        compressed
        fullWidth
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
    </EuiFormControlLayout>
  );
};
