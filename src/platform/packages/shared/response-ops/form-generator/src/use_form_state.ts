/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import type { FieldDefinition } from './form';

interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string | string[]>;
  touched: Record<string, boolean>;
}

export const useFormState = (fields: FieldDefinition[]) => {
  const initialValues = fields.reduce((acc, field) => {
    acc[field.id] = field.initialValue ?? field.value ?? '';
    return acc;
  }, {} as Record<string, unknown>);

  const [formState, setFormState] = useState<FormState>({
    values: initialValues,
    errors: {},
    touched: {},
  });

  const handleChange = (fieldId: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      values: { ...prev.values, [fieldId]: value },
      errors: { ...prev.errors, [fieldId]: '' },
    }));
  };

  const handleBlur = (fieldId: string) => {
    setFormState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [fieldId]: true },
    }));

    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      const validationResult = field.validate(formState.values[fieldId]);
      if (validationResult) {
        setFormState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [fieldId]: validationResult },
        }));
      }
    }
  };

  const handleSubmit = (onSuccess: ({ data }: { data: Record<string, unknown> }) => void) => {
    return (e: React.FormEvent) => {
      e.preventDefault();

      const allTouched = fields.reduce((acc, field) => {
        acc[field.id] = true;
        return acc;
      }, {} as Record<string, boolean>);

      setFormState((prev) => ({ ...prev, touched: allTouched }));

      const errors: Record<string, string | string[]> = {};
      let hasErrors = false;

      const cleanedValues: Record<string, unknown> = {};

      fields.forEach((field) => {
        const value = formState.values[field.id];
        const cleanedValue = typeof field.cleanup === 'function' ? field.cleanup(value) : value;
        cleanedValues[field.id] = cleanedValue;

        const validationResult = field.validate(cleanedValue);
        if (validationResult) {
          errors[field.id] = validationResult;
          hasErrors = true;
        }
      });

      if (hasErrors) {
        setFormState((prev) => ({
          ...prev,
          errors,
        }));
      } else {
        onSuccess({ data: cleanedValues });
      }
    };
  };

  const reset = () => {
    setFormState({ values: initialValues, errors: {}, touched: {} });
  };

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
};
