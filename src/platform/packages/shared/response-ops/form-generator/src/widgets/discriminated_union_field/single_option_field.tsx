/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { z } from '@kbn/zod/v4';
import { EuiFormFieldset, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { getMeta } from '../../schema_metadata';
import type { DiscriminatedUnionWidgetProps } from './discriminated_union_field';
import { getDiscriminatorKey } from './discriminated_union_field';
import { getWidget } from '..';

const getDiscriminatorFieldValue = (
  optionSchema: z.ZodObject<z.ZodRawShape>,
  discriminatorKey: string
) => {
  return (optionSchema.shape[discriminatorKey] as z.ZodLiteral<string>).value;
};

export const SingleOptionUnionField: React.FC<DiscriminatedUnionWidgetProps> = ({
  fieldId,
  value,
  label,
  onChange,
  onBlur,
  schema,
  fullWidth,
  setFieldError,
  setFieldTouched,
  errors = {},
  touched = {},
  meta,
}) => {
  const discriminatedSchema = schema as z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>;
  const singleOptionSchema = discriminatedSchema.options[0];
  const discriminatorKey = getDiscriminatorKey(discriminatedSchema);
  const discriminatorValue = getDiscriminatorFieldValue(singleOptionSchema, discriminatorKey);

  const [internalTouched, setInternalTouched] = React.useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});

  const validateField = useCallback(
    (fieldValue: unknown, subSchema: z.ZodTypeAny): string[] | undefined => {
      try {
        subSchema.parse(fieldValue);
        return undefined;
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return validationError.issues.map((issue) => issue.message);
        }
        return ['Invalid value'];
      }
    },
    []
  );

  const valueObj = useMemo(() => {
    return typeof value === 'object' && value !== null
      ? value
      : { [discriminatorKey]: discriminatorValue };
  }, [value, discriminatorValue, discriminatorKey]);

  const fields = useMemo(() => {
    return Object.entries(singleOptionSchema.shape).map(([fieldKey, subSchema], index: number) => {
      if (fieldKey === discriminatorKey) return null; // Skip discriminator field

      const fieldSchema = subSchema as z.ZodTypeAny;
      const metaInfo = getMeta(fieldSchema);
      const widget = metaInfo?.widget || 'text';
      const fieldValue = valueObj[fieldKey] ?? '';

      const WidgetComponent = getWidget(widget);
      if (!WidgetComponent) {
        throw new Error(`Unsupported widget type: ${widget}`);
      }

      const subFieldId = `${fieldId}.${fieldKey}`;
      const isTouched = touched[subFieldId] || touched[fieldId] || internalTouched;
      const error = errors[subFieldId] || fieldErrors[fieldKey];
      const isInvalid = !!(isTouched && error);

      const handleChange = (_: string, newValue: unknown) => {
        const updatedValue = {
          ...valueObj,
          [fieldKey]: newValue,
        };

        onChange(fieldId, updatedValue);

        const validationErrors = validateField(newValue, fieldSchema);
        setFieldErrors((prev) => ({
          ...prev,
          [fieldKey]: validationErrors,
        }));

        if (setFieldError) {
          setFieldError(subFieldId, validationErrors);
        }
      };

      const handleBlur = () => {
        setInternalTouched(true);

        if (setFieldTouched) {
          setFieldTouched(subFieldId, true);
        }

        const validationErrors = validateField(valueObj[fieldKey], fieldSchema);

        setFieldErrors((prev) => ({
          ...prev,
          [fieldKey]: validationErrors,
        }));

        if (setFieldError) {
          setFieldError(subFieldId, validationErrors);
        }

        onBlur(subFieldId, value);
      };

      return (
        <React.Fragment key={fieldKey}>
          {index > 1 && <EuiSpacer size="s" />}
          <WidgetComponent
            fieldId={subFieldId}
            value={fieldValue}
            label={metaInfo?.label || fieldKey}
            error={error}
            isInvalid={isInvalid}
            onChange={handleChange}
            onBlur={handleBlur}
            schema={fieldSchema}
            meta={metaInfo}
            fullWidth
          />
        </React.Fragment>
      );
    });
  }, [
    singleOptionSchema.shape,
    fieldId,
    value,
    valueObj,
    touched,
    internalTouched,
    errors,
    fieldErrors,
    onChange,
    validateField,
    setFieldError,
    setFieldTouched,
    onBlur,
    discriminatorKey,
  ]);

  return (
    <EuiFormRow fullWidth={fullWidth} helpText={meta?.helpText}>
      <EuiFormFieldset legend={{ children: label }}>{fields}</EuiFormFieldset>
    </EuiFormRow>
  );
};
