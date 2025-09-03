/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import type { EuiFormRowProps, EuiRangeProps } from '@elastic/eui';
import { EuiFormRow, EuiIconTip, EuiRange } from '@elastic/eui';

export interface RuleSettingsRangeInputProps {
  label: EuiFormRowProps['label'];
  labelPopoverText?: string;
  min: number;
  max: number;
  value: number;
  fullWidth?: EuiRangeProps['fullWidth'];
  disabled?: EuiRangeProps['disabled'];
  onChange?: EuiRangeProps['onChange'];
}

export const RuleSettingsRangeInput = memo((props: RuleSettingsRangeInputProps) => {
  const { label, labelPopoverText, min, max, value, fullWidth, disabled, onChange, ...rest } =
    props;

  const renderLabel = () => {
    return (
      <div>
        {label}
        &nbsp;
        {labelPopoverText && label && (
          <EuiIconTip
            color="subdued"
            size="s"
            type="question"
            content={labelPopoverText}
            aria-label={String(label)}
          />
        )}
      </div>
    );
  };

  return (
    <EuiFormRow label={renderLabel()} fullWidth={fullWidth}>
      <EuiRange
        fullWidth={fullWidth}
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={onChange}
        showLabels
        showValue
        {...rest}
      />
    </EuiFormRow>
  );
});
