/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { TextWidgetProps } from './widget_props';

export const TextField: React.FC<TextWidgetProps> = ({
  fieldId,
  value,
  label,
  placeholder,
  fullWidth = true,
  error,
  isInvalid,
  onChange,
  onBlur,
}) => {
  return (
    <EuiFormRow label={label} error={error} isInvalid={isInvalid} fullWidth={fullWidth}>
      <EuiFieldText
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(fieldId, e.target.value)}
        onBlur={() => onBlur(fieldId)}
        isInvalid={isInvalid}
        fullWidth={fullWidth}
      />
    </EuiFormRow>
  );
};
