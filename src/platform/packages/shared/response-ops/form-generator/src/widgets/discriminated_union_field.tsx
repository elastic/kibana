/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { z } from '@kbn/zod/v4';
import { EuiCheckableCard, EuiFormFieldset, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { getUIMeta } from '../connector_spec_ui';
import { getWidget } from '.';
import type { DiscriminatedUnionWidgetProps } from './widget_props';

const getDiscriminatorFieldValue = (optionSchema: z.ZodObject<any>) => {
  return optionSchema.shape.type.value;
};

const getDefaultValuesForOption = (optionSchema: z.ZodObject<any>) => {
  const defaultValues: Record<string, any> = {};
  const discriminatorValue = getDiscriminatorFieldValue(optionSchema);

  defaultValues.type = discriminatorValue;

  Object.entries(optionSchema.shape).forEach(([fieldKey, fieldSchema]: [string, any]) => {
    if (fieldKey === 'type') return; // Skip discriminator

    try {
      const parsed = fieldSchema.parse(undefined);
      defaultValues[fieldKey] = parsed;
    } catch {
      if (fieldSchema instanceof z.ZodString) {
        defaultValues[fieldKey] = '';
      } else if (fieldSchema instanceof z.ZodNumber) {
        defaultValues[fieldKey] = 0;
      } else if (fieldSchema instanceof z.ZodBoolean) {
        defaultValues[fieldKey] = false;
      } else if (fieldSchema instanceof z.ZodArray) {
        defaultValues[fieldKey] = [];
      } else if (fieldSchema instanceof z.ZodObject) {
        defaultValues[fieldKey] = {};
      } else {
        defaultValues[fieldKey] = '';
      }
    }
  });

  return defaultValues;
};

export const getDiscriminatedUnionInitialValue = (
  schema: z.ZodDiscriminatedUnion<any>,
  defaultValue?: any
) => {
  if (!(schema instanceof z.ZodDiscriminatedUnion)) {
    throw new Error('Schema provided is not a ZodDiscriminatedUnion');
  }

  const uiMeta = getUIMeta(schema);
  const metadataDefault = uiMeta?.widgetOptions?.default;
  const valueToUse = metadataDefault ?? defaultValue;

  if (valueToUse) {
    const matchingOption = schema.options.find((option: z.ZodObject<any>) => {
      const discriminatorValue = getDiscriminatorFieldValue(option);
      return discriminatorValue === valueToUse;
    });

    if (matchingOption) {
      return getDefaultValuesForOption(matchingOption);
    }
  }

  return getDefaultValuesForOption(schema.options[0]);
};

export const DiscriminatedUnionField: React.FC<DiscriminatedUnionWidgetProps> = ({
  fieldId,
  value,
  label,
  error,
  isInvalid,
  onChange,
  onBlur,
  schema,
  fullWidth,
}) => {
  if (!(schema instanceof z.ZodDiscriminatedUnion)) {
    throw new Error('Schema provided to DiscriminatedUnionField is not a ZodDiscriminatedUnion');
  }

  const discriminatedSchema = schema as any;
  const schemaOptions = discriminatedSchema.options;
  const totalOptions = schemaOptions.length;

  const [nestedFieldErrors, setNestedFieldErrors] = useState<Record<string, string[] | undefined>>(
    {}
  );
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const validateNestedField = useCallback(
    (fieldValue: any, subSchema: z.ZodTypeAny): string[] | undefined => {
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

  useEffect(() => {
    if (error && Array.isArray(error) && error.length > 0) {
      const currentType = typeof value === 'object' && value !== null ? value.type : value;
      const currentOption = schemaOptions.find((option: z.ZodObject<any>) => {
        return getDiscriminatorFieldValue(option) === currentType;
      });

      if (currentOption && typeof value === 'object' && value !== null) {
        const parsedErrors: Record<string, string[] | undefined> = {};

        try {
          currentOption.parse(value);
          setNestedFieldErrors({});
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            validationError.issues.forEach((issue) => {
              const fieldPath = issue.path.join('.');
              if (fieldPath && fieldPath !== 'type') {
                // Only set error if the field has been touched
                if (touchedFields.has(fieldPath)) {
                  if (!parsedErrors[fieldPath]) {
                    parsedErrors[fieldPath] = [];
                  }
                  parsedErrors[fieldPath]!.push(issue.message);
                }
              }
            });
            setNestedFieldErrors(parsedErrors);
          }
        }
      }
    } else if (!error) {
      setNestedFieldErrors({});
    }
  }, [error, value, schemaOptions, touchedFields]);

  const options = useMemo(() => {
    return schemaOptions.map((optionSchema: z.ZodObject<any>, index: number) => {
      const discriminatorValue = getDiscriminatorFieldValue(optionSchema);
      const currentType = typeof value === 'object' && value !== null ? value.type : value;
      const isChecked = currentType === discriminatorValue;
      const checkableCardId = `${fieldId}-option-${discriminatorValue}`;

      const optionUiMeta = getUIMeta(optionSchema);
      const cardLabel = optionUiMeta?.widgetOptions?.label || discriminatorValue;

      const handleCardChange = () => {
        const newValue = getDefaultValuesForOption(optionSchema);
        setTouchedFields(new Set());
        onChange(fieldId, newValue);
      };

      const renderNestedFields = () => {
        if (!isChecked) return null;

        return (
          <>
            {Object.entries(optionSchema.shape).map(
              ([fieldKey, subSchema]: [string, any], nestedFieldsIndex: number) => {
                if (nestedFieldsIndex === 0) return null;

                const nestedUiMeta = getUIMeta(subSchema);
                const nestedWidget = nestedUiMeta?.widget || 'text';
                const valueObj =
                  typeof value === 'object' && value !== null ? value : { type: value };
                const nestedValue = valueObj[fieldKey] ?? '';

                const NestedWidgetComponent = getWidget(nestedWidget);
                if (!NestedWidgetComponent) {
                  throw new Error(`Unsupported widget type: ${nestedWidget}`);
                }

                const nestedFieldId = `${fieldId}.${fieldKey}`;

                const nestedFieldError = nestedFieldErrors[fieldKey];
                const nestedFieldIsInvalid = !!nestedFieldError;

                const handleNestedChange = (nestedFieldIdArg: string, newValue: any) => {
                  const currentValueObj =
                    typeof value === 'object' && value !== null
                      ? value
                      : { type: discriminatorValue };

                  const updatedValue = {
                    ...currentValueObj,
                    [fieldKey]: newValue,
                  };

                  onChange(fieldId, updatedValue);

                  const errors = validateNestedField(newValue, subSchema);
                  setNestedFieldErrors((prev) => ({
                    ...prev,
                    [fieldKey]: errors,
                  }));
                };

                const handleNestedBlur = () => {
                  setTouchedFields((prev) => new Set(prev).add(fieldKey));

                  const fieldValue = valueObj[fieldKey];
                  const errors = validateNestedField(fieldValue, subSchema);
                  setNestedFieldErrors((prev) => ({
                    ...prev,
                    [fieldKey]: errors,
                  }));
                  onBlur(fieldId);
                };

                return (
                  <React.Fragment key={fieldKey}>
                    <EuiSpacer size="s" />
                    <NestedWidgetComponent
                      fieldId={nestedFieldId}
                      value={nestedValue}
                      label={nestedUiMeta?.label || nestedUiMeta?.widgetOptions?.label || fieldKey}
                      error={nestedFieldError}
                      isInvalid={nestedFieldIsInvalid}
                      onChange={handleNestedChange}
                      onBlur={handleNestedBlur}
                      schema={subSchema}
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
            {renderNestedFields()}
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
    nestedFieldErrors,
    validateNestedField,
    onBlur,
  ]);

  return (
    <EuiFormRow fullWidth={fullWidth}>
      <EuiFormFieldset legend={{ children: label }}>{options}</EuiFormFieldset>
    </EuiFormRow>
  );
};
