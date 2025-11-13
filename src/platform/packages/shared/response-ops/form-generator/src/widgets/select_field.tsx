/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { z } from '@kbn/zod/v4';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { SelectWidgetProps } from './widget_props';

export const SelectField: React.FC<SelectWidgetProps> = ({
  fieldId,
  value,
  label,
  placeholder,
  fullWidth = true,
  error,
  isInvalid,
  onChange,
  onBlur,
  schema,
  options: providedOptions,
  helpText,
}) => {
  let options = providedOptions;

  if (!options && schema) {
    if (schema instanceof z.ZodEnum) {
      options = schema.options.map((option) => ({
        value: String(option),
        text: String(option),
      }));
    } else {
      throw new Error(`SelectField requires z.enum() schema or explicit options prop`);
    }
  }

  if (!options || options.length === 0) {
    throw new Error(`SelectField requires options either from schema or props`);
  }

  return (
    <EuiFormRow
      label={label}
      error={error}
      isInvalid={isInvalid}
      fullWidth={fullWidth}
      helpText={helpText}
    >
      <EuiSelect
        value={value}
        options={options}
        onChange={(e) => onChange(fieldId, e.target.value)}
        onBlur={() => onBlur(fieldId)}
        isInvalid={isInvalid}
        fullWidth={fullWidth}
      />
    </EuiFormRow>
  );
};
