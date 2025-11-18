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
import type { EuiSelectOption, EuiSelectProps } from '@elastic/eui';
import type { BaseMetadata, StripFormProps } from '../../schema_metadata';
import type { BaseWidgetProps } from '../types';
import type { WidgetType } from '../types';

export type SelectWidgetMeta = BaseMetadata & {
  widget: WidgetType.Select;
} & StripFormProps<EuiSelectProps>;

export type SelectWidgetProps = BaseWidgetProps<string, SelectWidgetMeta>;

export const getSelectOptions = (schema: z.ZodTypeAny): EuiSelectOption[] | undefined => {
  if (schema instanceof z.ZodEnum) {
    return schema.options.map((option) => ({
      value: String(option),
      text: String(option),
    }));
  }
  return undefined;
};

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
  meta,
  helpText,
}) => {
  const { options: metaOptions, hasNoInitialSelection, isDisabled } = meta || {};

  const selectOptions = schema ? getSelectOptions(schema) : undefined;
  const options = selectOptions || metaOptions;

  if (!options || options.length === 0) {
    throw new Error(`SelectField requires options either from schema or props`);
  }

  return (
    <EuiFormRow
      aria-label={label}
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
        onBlur={() => onBlur(fieldId, value)}
        isInvalid={isInvalid}
        fullWidth={fullWidth}
        disabled={isDisabled}
        hasNoInitialSelection={hasNoInitialSelection}
      />
    </EuiFormRow>
  );
};
