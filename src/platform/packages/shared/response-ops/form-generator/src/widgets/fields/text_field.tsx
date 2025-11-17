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
import type { EuiFieldTextProps } from '@elastic/eui';
import type { BaseMetadata, StripFormProps } from '../../schema_metadata';
import type { BaseWidgetProps, WidgetType } from '../types';

export type TextWidgetMeta = BaseMetadata & {
  widget: WidgetType.Text;
} & StripFormProps<EuiFieldTextProps>;

export type TextWidgetProps = BaseWidgetProps<string, TextWidgetMeta>;

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
  meta,
  helpText,
}) => {
  const { prepend, append, compressed, readOnly, isDisabled } = meta || {};

  return (
    <EuiFormRow
      label={label}
      error={error}
      isInvalid={isInvalid}
      fullWidth={fullWidth}
      helpText={helpText}
    >
      <EuiFieldText
        data-test-subj={fieldId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(fieldId, e.target.value)}
        onBlur={() => onBlur(fieldId, value)}
        isInvalid={isInvalid}
        fullWidth={fullWidth}
        disabled={isDisabled}
        prepend={prepend}
        append={append}
        compressed={compressed}
        readOnly={readOnly}
      />
    </EuiFormRow>
  );
};
