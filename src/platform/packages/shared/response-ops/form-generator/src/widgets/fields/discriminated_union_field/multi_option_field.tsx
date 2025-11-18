/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiCheckableCard, EuiFormFieldset, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { DiscriminatedUnionWidgetProps } from './discriminated_union_field';
import { getDefaultValuesFromSchema } from './get_default_values';
import { getWidgetComponent } from '../../registry';

export const MultiOptionUnionField: React.FC<DiscriminatedUnionWidgetProps> = ({
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
    throw new Error('MultiOptionUnionField requires unionOptions prop');
  }

  const { discriminatorKey, options: unionOptionsList } = unionOptions;

  const options = useMemo(() => {
    return unionOptionsList.map((option, index: number) => {
      const { value: discriminatorValue, label: cardLabel, fields, schema: optionSchema } = option;
      const currentType =
        typeof value === 'object' && value !== null ? value[discriminatorKey] : value;
      const isChecked = currentType === discriminatorValue;
      const checkableCardId = `${fieldId}-option-${discriminatorValue}`;

      const handleCardChange = () => {
        const newValue = getDefaultValuesFromSchema(optionSchema, discriminatorKey);
        onChange(fieldId, newValue);

        if (setFieldError) {
          fields.forEach((field) => {
            setFieldError(`${fieldId}.${field.id}`, undefined);
          });
        }
      };

      const renderOptionsFields = () => {
        if (!isChecked) return null;

        return (
          <>
            {fields.map((field) => {
              const { id: fieldKey, schema: fieldSchema, meta: fieldMeta } = field;
              const valueObj =
                typeof value === 'object' && value !== null ? value : { [discriminatorKey]: value };
              const optionValue = valueObj[fieldKey];

              const OptionWidgetComponent = getWidgetComponent(fieldSchema);

              const optionFieldId = `${fieldId}.${fieldKey}`;
              const optionFieldTouched = touched[optionFieldId] || touched[fieldId];
              const optionFieldError = errors[optionFieldId];
              const optionFieldIsInvalid = !!(optionFieldTouched && optionFieldError);

              const handleOptionChange = (_optionFieldIdArg: string, newValue: unknown) => {
                const currentValueObj =
                  typeof value === 'object' && value !== null
                    ? value
                    : { [discriminatorKey]: discriminatorValue };

                const updatedValue = {
                  ...currentValueObj,
                  [fieldKey]: newValue,
                };

                if (setFieldTouched) {
                  setFieldTouched(optionFieldId, true);
                }

                onChange(fieldId, updatedValue);

                if (validateField && setFieldError) {
                  const fieldErrors = validateField(fieldId, updatedValue, []);
                  setFieldError(optionFieldId, fieldErrors);
                }
              };

              const handleOptionBlur = () => {
                const wasTouched = touched[optionFieldId];

                if (wasTouched && validateField && setFieldError) {
                  const fieldErrors = validateField(fieldId, value, []);
                  setFieldError(optionFieldId, fieldErrors);
                }

                onBlur(optionFieldId, value);
              };

              return (
                <React.Fragment key={fieldKey}>
                  <EuiSpacer size="s" />
                  <OptionWidgetComponent
                    fieldId={optionFieldId}
                    value={optionValue}
                    label={fieldMeta?.label || fieldKey}
                    error={optionFieldError}
                    isInvalid={optionFieldIsInvalid}
                    onChange={handleOptionChange}
                    onBlur={handleOptionBlur}
                    schema={fieldSchema}
                    meta={fieldMeta}
                    fullWidth
                  />
                </React.Fragment>
              );
            })}
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
          {index < unionOptionsList.length - 1 && <EuiSpacer size="s" />}
        </React.Fragment>
      );
    });
  }, [
    unionOptionsList,
    value,
    fieldId,
    onChange,
    validateField,
    onBlur,
    errors,
    setFieldError,
    setFieldTouched,
    discriminatorKey,
    touched,
  ]);

  return (
    <EuiFormRow fullWidth={fullWidth} helpText={meta?.helpText}>
      <EuiFormFieldset legend={{ children: label }}>{options}</EuiFormFieldset>
    </EuiFormRow>
  );
};
