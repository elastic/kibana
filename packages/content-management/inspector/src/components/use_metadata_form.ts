/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useCallback, useMemo, useRef } from 'react';

import type { Item } from '../types';

interface Field<T = string> {
  value: T;
  isValid: boolean;
  isChangingValue: boolean;
  errorMessage?: string;
}

interface Fields {
  title: Field<string>;
  description: Field<string>;
}

const validators: { [key in keyof Fields]: ((value: unknown) => string | null) | null } = {
  title: (value) => {
    if (value === 'balbi') {
      return 'Oh yes :)';
    }
    return null;
  },
  description: null,
};

export const useMetadataForm = ({ item }: { item: Item }) => {
  const changingValueTimeout = useRef<{ [key in keyof Fields]?: NodeJS.Timeout | null }>({});
  const [fields, setFields] = useState<Fields>({
    title: { value: item.title, isValid: true, isChangingValue: false },
    description: { value: item.description ?? '', isValid: true, isChangingValue: false },
  });

  const setFieldValue = useCallback(
    (fieldName: keyof Fields) => (value: string) => {
      const validator = validators[fieldName];
      let isValid = true;
      let errorMessage: string | null = null;

      if (validator) {
        errorMessage = validator(value);
        isValid = errorMessage === null;
      }

      const timeoutRef = changingValueTimeout.current[fieldName];
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
      changingValueTimeout.current[fieldName] = null;

      setFields((prev) => {
        const field = prev[fieldName];
        return {
          ...prev,
          [fieldName]: {
            ...field,
            isValid,
            isChangingValue: true,
            errorMessage,
            value,
          },
        };
      });

      // We add a 500s delay so possible errors of the field don't show up
      // _immediately_ as the user writes and we avoid flickering of error message.
      changingValueTimeout.current[fieldName] = setTimeout(() => {
        setFields((prev) => {
          return {
            ...prev,
            [fieldName]: {
              ...prev[fieldName],
              isChangingValue: false,
            },
          };
        });
      }, 500);
    },
    []
  );

  const setTitle = useMemo(() => setFieldValue('title'), [setFieldValue]);
  const setDescription = useMemo(() => setFieldValue('description'), [setFieldValue]);

  const validate = useCallback(() => {
    return Object.values(fields).every((field: Field) => field.isValid);
  }, [fields]);

  const isValid = validate();

  return {
    title: fields.title,
    setTitle,
    description: fields.description,
    setDescription,
    isValid,
  };
};

export type MetadataFormState = ReturnType<typeof useMetadataForm>;
