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

interface FormState<T> {
  values: T;
  errors: Record<string, string | string[]>;
  touched: Record<string, boolean>;
}

/**
 * Type utility that extracts the type of a nested property using dot-notation path.
 *
 * This recursively traverses the type structure to infer the correct type at any depth:
 * - For path "name": returns T['name']
 * - For path "authType.username": returns T['authType']['username']
 * - For path "config.nested.deep.value": recursively extracts the type at each level
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

const getNestedValue = <T, P extends string>(obj: T, path: P): PathValue<T, P> => {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined as PathValue<T, P>;
    current = (current as Record<string, unknown>)[key];
  }
  return current as PathValue<T, P>;
};

const setNestedValue = <T, P extends string>(obj: T, path: P, value: PathValue<T, P>): T => {
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

export const useFormState = <T>(fields: FieldDefinition[]) => {
  const initialValues = fields.reduce((acc, field) => {
    const key = field.id as keyof T;
    (acc as T)[key] = (field.initialValue ?? field.value ?? '') as T[keyof T];
    return acc;
  }, {} as T);

  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
  });

  const handleChange = useCallback((fieldId: string, value: unknown) => {
    setFormState((prev: FormState<T>) => {
      const isNestedPath = fieldId.includes('.');

      let newValues: T;
      if (isNestedPath) {
        newValues = setNestedValue(prev.values, fieldId, value as PathValue<T, typeof fieldId>);
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
      const parentFieldId = fieldId.split('.')[0];
      const field = fields.find((f) => f.id === parentFieldId);

      setFormState((prev: FormState<T>) => {
        const newTouched = { ...prev.touched, [fieldId]: true };

        if (!field) {
          return {
            ...prev,
            touched: newTouched,
          };
        }

        const fieldValue = fieldId.includes('.')
          ? getNestedValue(prev.values, fieldId)
          : prev.values[fieldId as unknown as keyof T];
        const validationResult = field.validate(fieldValue);

        if (!validationResult) {
          return {
            ...prev,
            touched: newTouched,
          };
        }

        if (
          Array.isArray(validationResult) &&
          validationResult.length > 0 &&
          typeof validationResult[0] === 'object' &&
          'path' in validationResult[0]
        ) {
          if (fieldId.includes('.')) {
            const nestedFieldName = fieldId.split('.').slice(1).join('.');
            const matchingIssue: any = validationResult.find((issue: any) => {
              return issue.path && issue.path.join('.') === nestedFieldName;
            });

            if (matchingIssue && typeof matchingIssue === 'object' && 'message' in matchingIssue) {
              return {
                ...prev,
                touched: newTouched,
                errors: { ...prev.errors, [fieldId]: matchingIssue.message },
              };
            }
          } else {
            const topLevelIssue: any = validationResult.find((issue: any) => {
              return !issue.path || issue.path.length === 0;
            });

            if (topLevelIssue && typeof topLevelIssue === 'object' && 'message' in topLevelIssue) {
              return {
                ...prev,
                touched: newTouched,
                errors: { ...prev.errors, [fieldId]: topLevelIssue.message },
              };
            }
          }
        } else if (
          typeof validationResult === 'string' ||
          (Array.isArray(validationResult) &&
            (validationResult.length === 0 || typeof validationResult[0] === 'string'))
        ) {
          return {
            ...prev,
            touched: newTouched,
            errors: { ...prev.errors, [fieldId]: validationResult as string | string[] },
          };
        }

        return {
          ...prev,
          touched: newTouched,
        };
      });
    },
    [fields]
  );

  const setFieldError = useCallback((fieldId: string, error: string | string[] | undefined) => {
    setFormState((prev: FormState<T>) => {
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
    setFormState((prev: FormState<T>) => ({
      ...prev,
      touched: { ...prev.touched, [fieldId]: touched },
    }));
  }, []);

  const getFieldValue = useCallback(
    <P extends string>(fieldId: P): PathValue<T, P> | T[keyof T] => {
      if (fieldId.includes('.')) {
        return getNestedValue(formState.values, fieldId);
      }
      return formState.values[fieldId as unknown as keyof T];
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
        const validationResult = field.validate(value);

        if (
          Array.isArray(validationResult) &&
          validationResult.length > 0 &&
          typeof validationResult[0] === 'object' &&
          'path' in validationResult[0] &&
          fieldId.includes('.')
        ) {
          const nestedFieldName = fieldId.split('.').slice(1).join('.');

          const matchingIssue: any = validationResult.find((issue: any) => {
            return issue.path && issue.path.join('.') === nestedFieldName;
          });

          return matchingIssue && typeof matchingIssue === 'object' && 'message' in matchingIssue
            ? matchingIssue.message
            : undefined;
        }

        if (
          typeof validationResult === 'string' ||
          (Array.isArray(validationResult) &&
            (validationResult.length === 0 || typeof validationResult[0] === 'string'))
        ) {
          return validationResult as string | string[];
        }
      }
      return undefined;
    },
    []
  );

  const handleSubmit = (onSuccess: ({ data }: { data: T }) => void) => {
    return (e: React.FormEvent) => {
      e.preventDefault();

      const allTouched = fields.reduce((acc, field) => {
        acc[field.id] = true;
        return acc;
      }, {} as Record<string, boolean>);

      setFormState((prev: FormState<T>) => ({ ...prev, touched: allTouched }));

      const errors: Record<string, string | string[]> = {};
      let hasErrors = false;

      const cleanedValues = {} as Partial<T>;

      fields.forEach((field) => {
        const fieldKey = field.id as keyof T;
        const value = formState.values[fieldKey];
        cleanedValues[fieldKey] = value as T[keyof T];

        const validationResult = field.validate(value);
        if (validationResult) {
          if (
            Array.isArray(validationResult) &&
            validationResult.length > 0 &&
            typeof validationResult[0] === 'object' &&
            'path' in validationResult[0]
          ) {
            validationResult.forEach((issue: any) => {
              if (issue.path && issue.path.length > 0) {
                const nestedFieldId = `${field.id}.${issue.path.join('.')}`;
                errors[nestedFieldId] = issue.message;
                allTouched[nestedFieldId] = true;
              } else {
                errors[field.id] = issue.message;
              }
            });
            hasErrors = true;
          } else {
            errors[field.id] = validationResult as string | string[];
            hasErrors = true;
          }
        }
      });

      if (hasErrors) {
        setFormState((prev: FormState<T>) => ({
          ...prev,
          errors,
          touched: allTouched,
        }));
      } else {
        onSuccess({ data: cleanedValues as T });
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
