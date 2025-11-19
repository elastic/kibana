/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFormFieldset, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { getWidgetComponent } from '../../registry';
import type { DiscriminatedUnionWidgetProps, UnionOptionField } from './discriminated_union_field';

export const SingleOptionUnionField: React.FC<DiscriminatedUnionWidgetProps> = ({
  fieldId,
  value,
  label,
  onChange,
  onBlur,
  unionOptions,
  fullWidth,
  setFieldError,
  setFieldTouched,
  errors = {},
  touched = {},
  meta,
  validateField,
}) => {
  const { options } = unionOptions;
  const singleOption = options[0];

  const fields = useMemo(() => {
    return singleOption.fields.map((field, index: number) => {
      const { id: fieldKey, schema: fieldSchema, meta: fieldMeta }: UnionOptionField = field;
      const fieldValue = value[fieldKey] ?? '';

      const WidgetComponent = getWidgetComponent(fieldSchema);

      const subFieldId = `${fieldId}.${fieldKey}`;
      const isTouched = touched[subFieldId] || touched[fieldId];
      const error = errors[subFieldId];
      const isInvalid = Boolean(isTouched && error);

      const handleChange = (_: string, newValue: unknown) => {
        const updatedValue = {
          ...value,
          [fieldKey]: newValue,
        };

        if (setFieldTouched) {
          setFieldTouched(subFieldId, true);
        }

        onChange(fieldId, updatedValue);

        if (validateField && setFieldError) {
          const validationError = validateField(fieldId, updatedValue, []);
          setFieldError(subFieldId, validationError);
        }
      };

      const handleBlur = () => {
        const wasTouched = touched[subFieldId];

        if (wasTouched && validateField && setFieldError) {
          const validationError = validateField(fieldId, value, []);
          setFieldError(subFieldId, validationError);
        }

        onBlur(subFieldId, value);
      };

      return (
        <React.Fragment key={fieldKey}>
          {index > 0 && <EuiSpacer size="s" />}
          <WidgetComponent
            fieldId={subFieldId}
            value={fieldValue}
            label={fieldMeta?.label || fieldKey}
            error={error}
            isInvalid={isInvalid}
            onChange={handleChange}
            onBlur={handleBlur}
            schema={fieldSchema}
            meta={fieldMeta}
            fullWidth
          />
        </React.Fragment>
      );
    });
  }, [
    singleOption.fields,
    fieldId,
    value,
    touched,
    errors,
    onChange,
    validateField,
    setFieldError,
    setFieldTouched,
    onBlur,
  ]);

  return (
    <EuiFormRow fullWidth={fullWidth} helpText={meta?.helpText}>
      <EuiFormFieldset legend={{ children: label }}>{fields}</EuiFormFieldset>
    </EuiFormRow>
  );
};
