/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { z } from '@kbn/zod/v4';
import { EuiFormFieldset, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { BaseMetadata } from '../../../schema_metadata';
import { getWidgetComponent } from '../../registry';
import type { DiscriminatedUnionWidgetProps } from './discriminated_union_field';

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
  if (!unionOptions) {
    throw new Error('SingleOptionUnionField requires unionOptions prop');
  }

  const { discriminatorKey, options } = unionOptions;
  const singleOption = options[0];

  const valueObj = useMemo(() => {
    return typeof value === 'object' && value !== null
      ? value
      : { [discriminatorKey]: singleOption.value };
  }, [value, discriminatorKey, singleOption.value]);

  const fields = useMemo(() => {
    return singleOption.fields.map((field, index: number) => {
      const {
        id: fieldKey,
        schema: fieldSchema,
        meta: fieldMeta,
      }: {
        id: string;
        schema: z.ZodTypeAny;
        meta: BaseMetadata;
      } = field;
      const fieldValue = valueObj[fieldKey] ?? '';

      const WidgetComponent = getWidgetComponent(fieldSchema);

      const subFieldId = `${fieldId}.${fieldKey}`;
      const isTouched = touched[subFieldId] || touched[fieldId];
      const error = errors[subFieldId];
      const isInvalid = !!(isTouched && error);

      const handleChange = (_: string, newValue: unknown) => {
        const updatedValue = {
          ...valueObj,
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
          const validationError = validateField(fieldId, valueObj, []);
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
    valueObj,
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
