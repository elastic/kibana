/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useReducer, useCallback, useMemo } from 'react';
import type { FieldDefinition } from './form';

interface FormState<T> {
  values: T;
  errors: Record<string, string | string[]>;
  touched: Record<string, boolean>;
}

type FormAction<T> =
  | { type: 'CHANGE_FIELD'; fieldId: string; value: unknown }
  | { type: 'BLUR_FIELD'; fieldId: string; value: unknown; field?: FieldDefinition }
  | { type: 'SET_ERROR'; fieldId: string; error?: string | string[] }
  | { type: 'SET_TOUCHED'; fieldId: string; touched: boolean }
  | { type: 'SET_ALL_TOUCHED'; touched: Record<string, boolean> }
  | {
      type: 'SUBMIT_ERRORS';
      errors: Record<string, string | string[]>;
      touched: Record<string, boolean>;
    }
  | { type: 'RESET'; initialValues: T };

/**
 * Type utility that extracts the type of a option property using dot-notation path.
 *
 * This recursively traverses the type structure to infer the correct type at any depth:
 * - For path "name": returns T['name']
 * - For path "authType.username": returns T['authType']['username']
 * - For path "config.option.deep.value": recursively extracts the type at each level
 *
 * @example
 * type Form = { user: { profile: { name: string } } }
 * PathValue<Form, "user.profile.name"> // → string
 * PathValue<Form, "user.profile"> // → { name: string }
 * PathValue<Form, "user"> // → { profile: { name: string } }
 */
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? T[K] extends object
      ? PathValue<T[K], Rest>
      : unknown
    : unknown
  : P extends keyof T
  ? T[P]
  : unknown;

const getOptionValue = <T, P extends string>(obj: T, path: P): PathValue<T, P> => {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined as PathValue<T, P>;
    current = (current as Record<string, unknown>)[key];
  }
  return current as PathValue<T, P>;
};

const setOptionValue = <T, P extends string>(obj: T, path: P, value: PathValue<T, P>): T => {
  const keys = path.split('.');
  const result = { ...obj } as T;
  let current: Record<string, unknown> = result as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const currentValue = current[key];
    if (currentValue === undefined || currentValue === null || typeof currentValue !== 'object') {
      current[key] = {};
    } else {
      current[key] = { ...(currentValue as Record<string, unknown>) };
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
};

const clearFieldErrors = (
  errors: Record<string, string | string[]>,
  fieldId: string
): Record<string, string | string[]> => {
  const newErrors = { ...errors };
  delete newErrors[fieldId];
  Object.keys(newErrors).forEach((errorKey) => {
    if (errorKey.startsWith(fieldId + '.')) {
      delete newErrors[errorKey];
    }
  });
  return newErrors;
};

const formReducer = <T>(state: FormState<T>, action: FormAction<T>): FormState<T> => {
  switch (action.type) {
    case 'CHANGE_FIELD': {
      const { fieldId, value } = action;
      const isOptionPath = fieldId.includes('.');

      const newValues: T = isOptionPath
        ? setOptionValue(state.values, fieldId, value as PathValue<T, typeof fieldId>)
        : { ...state.values, [fieldId]: value };

      return {
        ...state,
        values: newValues,
        errors: clearFieldErrors(state.errors, fieldId),
        touched: { ...state.touched, [fieldId]: true },
      };
    }

    case 'BLUR_FIELD': {
      const { fieldId, value, field } = action;

      const wasChanged = state.touched[fieldId];

      if (!field || !wasChanged) {
        return state;
      }

      const validationResult = field.validate(value);
      const newErrors = { ...clearFieldErrors(state.errors, field.id) };
      const newTouched = { ...state.touched };

      if (validationResult) {
        const isNestedField = fieldId.includes('.');
        const nestedFieldPath = isNestedField ? fieldId.split('.').slice(1).join('.') : '';

        Object.entries(validationResult).forEach(([path, error]) => {
          const errorKey = path ? `${field.id}.${path}` : field.id;

          if (!isNestedField || path === nestedFieldPath) {
            newErrors[errorKey] = error;
            newTouched[errorKey] = true;
          }
        });
      }

      return {
        ...state,
        touched: newTouched,
        errors: newErrors,
      };
    }

    case 'SET_ERROR': {
      const { fieldId, error } = action;
      const newErrors = { ...state.errors };
      if (error) {
        newErrors[fieldId] = error;
      } else {
        delete newErrors[fieldId];
      }
      return { ...state, errors: newErrors };
    }

    case 'SET_TOUCHED': {
      const { fieldId, touched } = action;
      return {
        ...state,
        touched: { ...state.touched, [fieldId]: touched },
      };
    }

    case 'SET_ALL_TOUCHED': {
      return {
        ...state,
        touched: action.touched,
      };
    }

    case 'SUBMIT_ERRORS': {
      const { errors, touched } = action;
      return {
        ...state,
        errors,
        touched,
      };
    }

    case 'RESET': {
      return {
        values: action.initialValues,
        errors: {},
        touched: {},
      };
    }

    default:
      return state;
  }
};

export const useFormState = <T>(fields: FieldDefinition[]) => {
  const initialValues = useMemo(
    () =>
      fields.reduce((acc, field) => {
        const key = field.id as keyof T;
        (acc as T)[key] = (field.initialValue ?? field.value ?? '') as T[keyof T];
        return acc;
      }, {} as T),
    [fields]
  );

  const [formState, dispatch] = useReducer(formReducer<T>, {
    values: initialValues,
    errors: {},
    touched: {},
  });

  const handleChange = useCallback((fieldId: string, value: unknown) => {
    dispatch({ type: 'CHANGE_FIELD', fieldId, value });
  }, []);

  const handleBlur = useCallback(
    (fieldId: string, value: unknown) => {
      const parentFieldId = fieldId.split('.')[0];
      const field = fields.find((f) => f.id === parentFieldId);
      dispatch({ type: 'BLUR_FIELD', fieldId, value, field });
    },
    [fields]
  );

  const setFieldError = useCallback((fieldId: string, error: string | string[] | undefined) => {
    dispatch({ type: 'SET_ERROR', fieldId, error });
  }, []);

  const setFieldTouched = useCallback((fieldId: string, touched: boolean = true) => {
    dispatch({ type: 'SET_TOUCHED', fieldId, touched });
  }, []);

  const getFieldValue = useCallback(
    <P extends string>(fieldId: P): PathValue<T, P> | T[keyof T] => {
      if (fieldId.includes('.')) {
        return getOptionValue(formState.values, fieldId);
      }
      return formState.values[fieldId as unknown as keyof T];
    },
    [formState.values]
  );

  const validateField = useCallback(
    (fieldId: string, value: unknown, fieldDefinitions: FieldDefinition[]) => {
      const parentFieldId = fieldId.split('.')[0];
      const field = fieldDefinitions.find((f) => f.id === parentFieldId);

      if (field) {
        const validationResult = field.validate(value);
        return validationResult?.[''];
      }
      return undefined;
    },
    []
  );

  const handleSubmit = useCallback(
    (onSuccess: ({ data }: { data: T }) => void) => {
      return (e: React.FormEvent) => {
        e.preventDefault();

        const allTouched: Record<string, boolean> = {};
        const errors: Record<string, string | string[]> = {};
        let hasErrors = false;

        const cleanedValues = {} as Partial<T>;

        fields.forEach((field) => {
          const fieldKey = field.id as keyof T;
          const value = formState.values[fieldKey];
          cleanedValues[fieldKey] = value as T[keyof T];

          allTouched[field.id] = true;

          const validationResult = field.validate(value);
          if (validationResult) {
            Object.entries(validationResult).forEach(([path, error]) => {
              const errorKey = path ? `${field.id}.${path}` : field.id;
              errors[errorKey] = error;
              allTouched[errorKey] = true;
            });
            hasErrors = true;
          }
        });

        dispatch({ type: 'SUBMIT_ERRORS', errors, touched: allTouched });

        if (!hasErrors) {
          onSuccess({ data: cleanedValues as T });
        }
      };
    },
    [fields, formState.values]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', initialValues });
  }, [initialValues]);

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
