/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback } from 'react';
import type { FieldDefinition } from './form';

interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string | string[]>;
  touched: Record<string, boolean>;
}

const getNestedValue = (obj: any, path: string): any => {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
};

const setNestedValue = (obj: any, path: string, value: any): any => {
  const keys = path.split('.');
  const result = { ...obj };
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
      current[key] = {};
    } else {
      current[key] = { ...current[key] };
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return result;
};

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

  const handleChange = useCallback((fieldId: string, value: unknown) => {
    setFormState((prev) => {
      const isNestedPath = fieldId.includes('.');

      let newValues;
      if (isNestedPath) {
        newValues = setNestedValue(prev.values, fieldId, value);
      } else {
        newValues = { ...prev.values, [fieldId]: value };
      }

      const newErrors = { ...prev.errors };
      newErrors[fieldId] = '';

      Object.keys(newErrors).forEach((errorKey) => {
        if (errorKey.startsWith(fieldId + '.')) {
          newErrors[errorKey] = '';
        }
      });

      return {
        ...prev,
        values: newValues,
        errors: newErrors,
      };
    });
  }, []);

  const handleBlur = useCallback(
    (fieldId: string) => {
      setFormState((prev) => ({
        ...prev,
        touched: { ...prev.touched, [fieldId]: true },
      }));

      const parentFieldId = fieldId.split('.')[0];
      const field = fields.find((f) => f.id === parentFieldId);
      if (field) {
        const fieldValue = fieldId.includes('.')
          ? getNestedValue(formState.values, fieldId)
          : formState.values[fieldId];
        const validationResult = field.validate(fieldValue);
        if (validationResult) {
          setFormState((prev) => ({
            ...prev,
            errors: { ...prev.errors, [fieldId]: validationResult },
          }));
        }
      }
    },
    [fields, formState.values]
  );

  const setFieldError = useCallback((fieldId: string, error: string | string[] | undefined) => {
    setFormState((prev) => {
      const newErrors = { ...prev.errors };
      if (error) {
        newErrors[fieldId] = error;
      } else {
        delete newErrors[fieldId];
      }
      return {
        ...prev,
        errors: newErrors,
      };
    });
  }, []);

  const setFieldTouched = useCallback((fieldId: string, touched: boolean = true) => {
    setFormState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [fieldId]: touched },
    }));
  }, []);

  const getFieldValue = useCallback(
    (fieldId: string): unknown => {
      if (fieldId.includes('.')) {
        return getNestedValue(formState.values, fieldId);
      }
      return formState.values[fieldId];
    },
    [formState.values]
  );

  const validateField = useCallback(
    (
      fieldId: string,
      value: unknown,
      fieldDefinitions: FieldDefinition[]
    ): string | string[] | undefined => {
      const parentFieldId = fieldId.split('.')[0];
      const field = fieldDefinitions.find((f) => f.id === parentFieldId);

      if (field) {
        return field.validate(value);
      }
      return undefined;
    },
    []
  );

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
    setFieldError,
    setFieldTouched,
    getFieldValue,
    validateField,
  };
};
