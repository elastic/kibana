/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useReducer, useCallback } from 'react';
import type { FieldDefinition } from './form';
import { ROOT_ERROR_KEY } from './form';

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
 *
 * @example
 * type Form = { user: { profile: { name: string } } }
 * PathValue<Form, "user.profile"> // → { name: string }
 * PathValue<Form, "user"> // → { profile: { name: string } }
 * PathValue<Form, "user.profile.name"> // → never (we do not support deeper than 2 levels)
 */
type PathValue<T, P extends string> = P extends `${infer Root}.${infer Child}`
  ? Root extends keyof T
    ? T[Root] extends object
      ? PathValue<T[Root], Child>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;

const getOptionValue = <T, P extends string>(obj: T, path: P): PathValue<T, P> => {
  const [first, second] = path.split('.');
  const record = obj as Record<string, unknown>;

  if (!second) {
    return record[first] as PathValue<T, P>;
  }

  const nested = record[first];
  if (nested === undefined || nested === null) {
    return undefined as PathValue<T, P>;
  }

  return (nested as Record<string, unknown>)[second] as PathValue<T, P>;
};

const setOptionValue = <T, P extends string>(obj: T, path: P, value: PathValue<T, P>): T => {
  const keys = path.split('.');

  if (keys.length === 1) {
    return { ...obj, [keys[0]]: value } as T;
  }

  const [first, second] = keys;
  const record = obj as Record<string, unknown>;
  const currentValue = record[first];
  const nestedValue = currentValue && typeof currentValue === 'object' ? currentValue : {};

  return {
    ...obj,
    [first]: { ...nestedValue, [second]: value },
  } as T;
};

const clearFieldErrors = (
  errors: Record<string, string | string[]>,
  fieldId: string
): Record<string, string | string[]> => {
  const result: Record<string, string | string[]> = {};
  Object.keys(errors).forEach((errorKey) => {
    if (errorKey !== fieldId && !errorKey.startsWith(fieldId + '.')) {
      result[errorKey] = errors[errorKey];
    }
  });
  return result;
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
        const nestedFieldPath = isNestedField ? fieldId.split('.')[1] : '';

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

export const useFormState = <TSchema extends Record<string, unknown>>(
  fields: FieldDefinition[]
) => {
  const initialValues = Object.fromEntries(
    fields.map((field) => [field.id, field.initialValue ?? ''])
  ) as TSchema;

  const [formState, dispatch] = useReducer(formReducer<TSchema>, {
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
    (fieldId: string) => {
      if (fieldId.includes('.')) {
        return getOptionValue(formState.values, fieldId);
      }
      return formState.values[fieldId as keyof TSchema];
    },
    [formState.values]
  );

  const validateField = useCallback(
    (fieldId: string, value: unknown, fieldDefinitions: FieldDefinition[]) => {
      const parentFieldId = fieldId.split('.')[0];
      const field = fieldDefinitions.find((f) => f.id === parentFieldId);

      if (field) {
        const validationResult = field.validate(value);
        return validationResult?.[ROOT_ERROR_KEY];
      }
      return undefined;
    },
    []
  );

  const handleSubmit = useCallback(
    (onSuccess: ({ data }: { data: TSchema }) => void) => {
      return (e: React.FormEvent) => {
        e.preventDefault();

        const allTouched: Record<string, boolean> = {};
        const errors: Record<string, string | string[]> = {};
        let hasErrors = false;

        fields.forEach((field) => {
          const fieldKey = field.id as keyof TSchema;
          const value = formState.values[fieldKey];

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
          onSuccess({ data: formState.values });
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
