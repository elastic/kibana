/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFieldPassword, EuiFormRow } from '@elastic/eui';
import type { EuiFieldPasswordProps } from '@elastic/eui';
import type { BaseMetadata, StripFormProps } from '../schema_metadata';
import type { BaseWidgetProps } from './widget_props';

export type PasswordWidgetMeta = BaseMetadata & {
  widget: 'password';
} & StripFormProps<EuiFieldPasswordProps>;

export type PasswordWidgetProps = BaseWidgetProps<string, PasswordWidgetMeta>;

export const PasswordField: React.FC<PasswordWidgetProps> = ({
  fieldId,
  value,
  label,
  placeholder,
  fullWidth = true,
  error,
  isInvalid,
  onChange,
  onBlur,
  meta,
  helpText,
}) => {
  const { isDisabled, type: passwordType, compressed } = meta || {};

  return (
    <EuiFormRow
      label={label}
      error={error}
      isInvalid={isInvalid}
      fullWidth={fullWidth}
      helpText={helpText}
    >
      <EuiFieldPassword
        data-test-subj={fieldId}
        type={passwordType ?? 'dual'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(fieldId, e.target.value)}
        onBlur={() => onBlur(fieldId, value)}
        isInvalid={isInvalid}
        fullWidth={fullWidth}
        disabled={isDisabled}
        compressed={compressed}
      />
    </EuiFormRow>
  );
};
