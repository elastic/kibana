/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import type { Item } from '../types';

export interface Field<TValueType = unknown> {
  value: TValueType;
  isChangingValue: boolean;
  errors?: string[];
  warnings?: string[];
}

interface Fields {
  title: Field<string>;
  description: Field<string>;
  tags: Field<string[]>;
}

interface Validator<TValueType = unknown> {
  type: 'warning' | 'error';
  fn: (value: TValueType, id: Item['id']) => undefined | string | Promise<undefined | string>;
}

type BasicValidators = Partial<{
  [key in keyof Fields]: Array<Validator<Fields[key]['value']>> | undefined;
}>;

export type CustomValidators = Pick<BasicValidators, 'title' | 'description'>;

type SetFieldValueFn<TField extends keyof Fields> = (value: Fields[TField]['value']) => void;

type SetFieldValueGetter<TField extends keyof Fields = keyof Fields> = (
  fieldName: TField
) => SetFieldValueFn<TField>;

const basicValidators: BasicValidators = {
  title: [
    {
      type: 'error',
      fn: (value) => {
        if (!value || !value.trim()) {
          return i18n.translate('contentManagement.contentEditor.metadataForm.nameIsEmptyError', {
            defaultMessage: 'A name is required.',
          });
        }
      },
    },
  ],
};

function getCustomValidation<TField extends keyof Fields>(
  field: TField,
  customValidators?: CustomValidators
): Array<Validator<Fields[TField]['value']>> {
  if (customValidators && ['title', 'description'].includes(field)) {
    return (customValidators[field] as Array<Validator<Fields[TField]['value']>>) ?? [];
  }
  return [];
}

const executeValidation = async <TField extends keyof Fields>(
  field: TField,
  id: string,
  value: Fields[TField]['value'],
  customValidators?: CustomValidators
) => {
  const results: Pick<Field, 'errors' | 'warnings'> = {
    warnings: [],
    errors: [],
  };

  for (const validator of [
    ...(basicValidators[field] ?? []),
    ...getCustomValidation(field, customValidators),
  ]) {
    const result = await validator.fn(value, id);

    if (result) {
      const key = validator.type === 'error' ? 'errors' : 'warnings';
      if (Array.isArray(results[key])) {
        results[key]!.push(result);
      } else {
        results[key] = [result];
      }
    }
  }
  return results;
};

export const useMetadataForm = ({
  item,
  customValidators,
}: {
  item: Item;
  customValidators?: CustomValidators;
}) => {
  const changingValueTimeout = useRef<{ [key in keyof Fields]?: NodeJS.Timeout | null }>({});
  const [fields, setFields] = useState<Fields>({
    title: { value: item.title, isChangingValue: false },
    description: {
      value: item.description ?? '',
      isChangingValue: false,
    },
    tags: {
      value: item.tags ? item.tags.map(({ id }) => id) : [],
      isChangingValue: false,
    },
  });

  const setFieldValue: SetFieldValueGetter = useCallback(
    (fieldName) => (value) => {
      const timeoutId = changingValueTimeout.current[fieldName];
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      changingValueTimeout.current[fieldName] = null;

      setFields((prev) => {
        const field = prev[fieldName];
        return {
          ...prev,
          [fieldName]: {
            ...field,
            value,
            errors: undefined,
            warnings: undefined,
            isChangingValue: true,
          },
        };
      });

      // We add a 500s delay so possible errors of the field don't show up
      // _immediately_ as the user writes, we avoid flickering of error message.
      changingValueTimeout.current[fieldName] = setTimeout(async () => {
        const { errors, warnings } = await executeValidation(
          fieldName,
          item.id,
          value,
          customValidators
        );

        setFields((prev) => {
          return {
            ...prev,
            [fieldName]: {
              ...prev[fieldName],
              errors,
              warnings,
              isChangingValue: false,
            },
          };
        });
      }, 500);
    },
    [customValidators, item.id]
  );

  const setTitle: SetFieldValueFn<'title'> = useMemo(() => setFieldValue('title'), [setFieldValue]);

  const setDescription: SetFieldValueFn<'description'> = useMemo(
    () => setFieldValue('description'),
    [setFieldValue]
  );

  const setTags: SetFieldValueFn<'tags'> = useMemo(() => setFieldValue('tags'), [setFieldValue]);

  const { errors, warnings, isChangingValue } = useMemo(
    () =>
      Object.values(fields).reduce<
        Pick<Field, 'errors' | 'warnings'> & { isChangingValue: boolean }
      >(
        (acc, field: Field) => {
          return {
            errors: [...(acc.errors ?? []), ...(field.errors ?? [])],
            warnings: [...(acc.warnings ?? []), ...(field.warnings ?? [])],
            isChangingValue: acc.isChangingValue || field.isChangingValue,
          };
        },
        {
          errors: [],
          warnings: [],
          isChangingValue: false,
        }
      ),
    [fields]
  );

  return {
    title: fields.title,
    setTitle,
    description: fields.description,
    setDescription,
    tags: fields.tags,
    setTags,

    isValid: errors?.length === 0,
    getErrors: () => errors,
    getWarnings: () => warnings,
    getIsChangingValue: () => isChangingValue,
  };
};

export type MetadataFormState = ReturnType<typeof useMetadataForm>;
