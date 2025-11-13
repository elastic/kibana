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
import { EuiCheckableCard, EuiFormFieldset, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { getMeta } from '../../get_metadata';
import type { DiscriminatedUnionWidgetProps } from '../widget_props';
import { getDefaultValuesForOption } from './get_default_values';
import { getWidget } from '..';

const getDiscriminatorFieldValue = (optionSchema: z.ZodObject<z.ZodRawShape>) => {
  return (optionSchema.shape.type as z.ZodLiteral<string>).value;
};

export const MultiOptionUnionField: React.FC<DiscriminatedUnionWidgetProps> = ({
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
}) => {
  if (!(schema instanceof z.ZodDiscriminatedUnion)) {
    throw new Error('Schema provided to MultiOptionUnionField is not a ZodDiscriminatedUnion');
  }

  const discriminatedSchema = schema as z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>;
  const schemaOptions = discriminatedSchema.options;
  const totalOptions = schemaOptions.length;

  const [internalTouchedFields, setInternalTouchedFields] = React.useState<Set<string>>(new Set());
  const [internalFieldErrors, setInternalFieldErrors] = React.useState<
    Record<string, string[] | undefined>
  >({});

  const validateOptionField = useCallback(
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

  const options = useMemo(() => {
    return schemaOptions.map((optionSchema: z.ZodObject<z.ZodRawShape>, index: number) => {
      const discriminatorValue = getDiscriminatorFieldValue(optionSchema);
      const currentType = typeof value === 'object' && value !== null ? value.type : value;
      const isChecked = currentType === discriminatorValue;
      const checkableCardId = `${fieldId}-option-${discriminatorValue}`;

      const optionMeta = getMeta(optionSchema);
      const staticProps = optionMeta?.widgetOptions || {};
      const cardLabel: string =
        (optionMeta?.widgetOptions?.label as string | undefined) || discriminatorValue;

      const handleCardChange = () => {
        const newValue = getDefaultValuesForOption(optionSchema);
        setInternalTouchedFields(new Set());
        setInternalFieldErrors({});
        onChange(fieldId, newValue);
      };

      const renderOptionsFields = () => {
        if (!isChecked) return null;

        return (
          <>
            {Object.entries(optionSchema.shape).map(
              ([fieldKey, subSchema], optionFieldsIndex: number) => {
                if (optionFieldsIndex === 0) return null;

                const fieldSchema = subSchema as z.ZodTypeAny;
                const optionFieldMeta = getMeta(fieldSchema);
                const optionWidget = optionFieldMeta?.widget || 'text';
                const valueObj =
                  typeof value === 'object' && value !== null ? value : { type: value };
                const optionValue = valueObj[fieldKey] ?? '';

                const OptionWidgetComponent = getWidget(optionWidget);
                if (!OptionWidgetComponent) {
                  throw new Error(`Unsupported widget type: ${optionWidget}`);
                }

                const optionFieldId = `${fieldId}.${fieldKey}`;
                const optionFieldTouched =
                  touched[optionFieldId] || touched[fieldId] || internalTouchedFields.has(fieldKey);
                const optionFieldError = errors[optionFieldId] || internalFieldErrors[fieldKey];
                const optionFieldIsInvalid = !!(
                  (optionFieldTouched && optionFieldError) ||
                  errors[optionFieldId]
                );

                const handleOptionChange = (_optionFieldIdArg: string, newValue: unknown) => {
                  const currentValueObj =
                    typeof value === 'object' && value !== null
                      ? value
                      : { type: discriminatorValue };

                  const updatedValue = {
                    ...currentValueObj,
                    [fieldKey]: newValue,
                  };

                  onChange(fieldId, updatedValue);

                  const fieldErrors = validateOptionField(newValue, fieldSchema);
                  setInternalFieldErrors((prev) => ({
                    ...prev,
                    [fieldKey]: fieldErrors,
                  }));

                  if (setFieldError) {
                    setFieldError(optionFieldId, fieldErrors);
                  }
                };

                const handleOptionBlur = () => {
                  setInternalTouchedFields((prev) => new Set(prev).add(fieldKey));

                  if (setFieldTouched) {
                    setFieldTouched(optionFieldId, true);
                  }

                  const fieldValue = valueObj[fieldKey];
                  const fieldErrors = validateOptionField(fieldValue, fieldSchema);

                  setInternalFieldErrors((prev) => ({
                    ...prev,
                    [fieldKey]: fieldErrors,
                  }));

                  if (setFieldError) {
                    setFieldError(optionFieldId, fieldErrors);
                  }

                  onBlur(optionFieldId, value);
                };

                return (
                  <React.Fragment key={fieldKey}>
                    <EuiSpacer size="s" />
                    <OptionWidgetComponent
                      {...staticProps}
                      fieldId={optionFieldId}
                      value={optionValue}
                      label={
                        optionFieldMeta?.label || optionFieldMeta?.widgetOptions?.label || fieldKey
                      }
                      error={optionFieldError}
                      isInvalid={optionFieldIsInvalid}
                      onChange={handleOptionChange}
                      onBlur={handleOptionBlur}
                      schema={fieldSchema}
                      fullWidth
                    />
                  </React.Fragment>
                );
              }
            )}
          </>
        );
      };

      return (
        <React.Fragment key={discriminatorValue}>
          <EuiCheckableCard
            id={checkableCardId}
            label={cardLabel}
            value={discriminatorValue}
            checked={isChecked}
            onChange={handleCardChange}
          >
            {renderOptionsFields()}
          </EuiCheckableCard>
          {index < totalOptions - 1 && <EuiSpacer size="s" />}
        </React.Fragment>
      );
    });
  }, [
    schemaOptions,
    value,
    fieldId,
    totalOptions,
    onChange,
    validateOptionField,
    onBlur,
    errors,
    setFieldError,
    setFieldTouched,
    touched,
    internalTouchedFields,
    internalFieldErrors,
  ]);

  return (
    <EuiFormRow fullWidth={fullWidth}>
      <EuiFormFieldset legend={{ children: label }}>{options}</EuiFormFieldset>
    </EuiFormRow>
  );
};
