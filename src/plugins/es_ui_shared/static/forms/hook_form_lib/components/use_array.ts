/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

import { FormHook, FieldConfig } from '../types';
import { getFieldValidityAndErrorMessage } from '../helpers';
import { useFormContext } from '../form_context';
import { useField, InternalFieldConfig } from '../hooks';

interface Props {
  path: string;
  initialNumberOfItems?: number;
  readDefaultValueOnForm?: boolean;
  validations?: FieldConfig<ArrayItem[]>['validations'];
  children: (formFieldArray: FormArrayField) => JSX.Element;
}

export interface ArrayItem {
  id: number;
  path: string;
  isNew: boolean;
}

export interface FormArrayField {
  items: ArrayItem[];
  error: string | null;
  addItem: () => void;
  removeItem: (id: number) => void;
  moveItem: (sourceIdx: number, destinationIdx: number) => void;
  form: FormHook;
}

/**
 * Use UseArray to dynamically add fields to your form.
 *
 * example:
 * If your form data looks like this:
 *
 * {
 *   users: []
 * }
 *
 * and you want to be able to add user objects ({ name: 'john', lastName. 'snow' }) inside
 * the "users" array, you would use UseArray to render rows of user objects with 2 fields in each of them ("name" and "lastName")
 *
 * Look at the README.md for some examples.
 */
export const UseArray = ({
  path,
  initialNumberOfItems,
  validations,
  readDefaultValueOnForm = true,
  children,
}: Props) => {
  const isMounted = useRef(false);
  const uniqueId = useRef(0);

  const form = useFormContext();
  const { __getFieldDefaultValue } = form;

  const getNewItemAtIndex = useCallback(
    (index: number): ArrayItem => ({
      id: uniqueId.current++,
      path: `${path}[${index}]`,
      isNew: true,
    }),
    [path]
  );

  const fieldDefaultValue = useMemo<ArrayItem[]>(() => {
    const defaultValues = readDefaultValueOnForm
      ? (__getFieldDefaultValue(path) as any[])
      : undefined;

    const getInitialItemsFromValues = (values: any[]): ArrayItem[] =>
      values.map((_, index) => ({
        id: uniqueId.current++,
        path: `${path}[${index}]`,
        isNew: false,
      }));

    return defaultValues
      ? getInitialItemsFromValues(defaultValues)
      : new Array(initialNumberOfItems).fill('').map((_, i) => getNewItemAtIndex(i));
  }, [
    path,
    initialNumberOfItems,
    readDefaultValueOnForm,
    __getFieldDefaultValue,
    getNewItemAtIndex,
  ]);

  // Create a new hook field with the "isIncludedInOutput" set to false so we don't use its value to build the final form data.
  // Apart from that the field behaves like a normal field and is hooked into the form validation lifecycle.
  const fieldConfigBase: FieldConfig<ArrayItem[]> & InternalFieldConfig<ArrayItem[]> = {
    defaultValue: fieldDefaultValue,
    valueChangeDebounceTime: 0,
    isIncludedInOutput: false,
  };

  const fieldConfig: FieldConfig<ArrayItem[]> & InternalFieldConfig<ArrayItem[]> = validations
    ? { validations, ...fieldConfigBase }
    : fieldConfigBase;

  const field = useField(form, path, fieldConfig);
  const { setValue, value, isChangingValue, errors } = field;

  // Derived state from the field
  const error = useMemo(() => {
    const { errorMessage } = getFieldValidityAndErrorMessage({ isChangingValue, errors });
    return errorMessage;
  }, [isChangingValue, errors]);

  const updatePaths = useCallback(
    (_rows: ArrayItem[]) => {
      return _rows.map(
        (row, index) =>
          ({
            ...row,
            path: `${path}[${index}]`,
          } as ArrayItem)
      );
    },
    [path]
  );

  const addItem = useCallback(() => {
    setValue((previousItems) => {
      const itemIndex = previousItems.length;
      return [...previousItems, getNewItemAtIndex(itemIndex)];
    });
  }, [setValue, getNewItemAtIndex]);

  const removeItem = useCallback(
    (id: number) => {
      setValue((previousItems) => {
        const updatedItems = previousItems.filter((item) => item.id !== id);
        return updatePaths(updatedItems);
      });
    },
    [setValue, updatePaths]
  );

  const moveItem = useCallback(
    (sourceIdx: number, destinationIdx: number) => {
      setValue((previousItems) => {
        const nextItems = [...previousItems];
        const removed = nextItems.splice(sourceIdx, 1)[0];
        nextItems.splice(destinationIdx, 0, removed);
        return updatePaths(nextItems);
      });
    },
    [setValue, updatePaths]
  );

  useEffect(() => {
    if (!isMounted.current) {
      return;
    }

    setValue((prev) => {
      return updatePaths(prev);
    });
  }, [path, updatePaths, setValue]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return children({ items: value, error, form, addItem, removeItem, moveItem });
};
