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

import { isEqual, get } from 'lodash';
import { useState, useEffect, useRef, useCallback } from 'react';
import { euiDragDropReorder } from '@elastic/eui';

import { FieldConfig, FormData, FieldHook } from '../types';
import { useFormContext } from '../form_context';
import { useField } from '../hooks';
import { unflattenObject } from '../lib';

interface Props<T extends unknown[] = unknown[]> {
  path: string;
  config?: FieldConfig<FormData, T>;
  initialNumberOfItems?: number;
  readDefaultValueOnForm?: boolean;
  children: (args: {
    field: FieldHook<T>;
    items: ArrayItem[];
    addItem: () => void;
    removeItem: (id: number) => void;
    moveItem: (sourceIdx: number, destinationIdx: number) => void;
  }) => JSX.Element;
}

export interface ArrayItem {
  id: number;
  path: string;
  isNew: boolean;
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
export const UseArray = <T extends unknown[] = unknown[]>({
  path,
  config,
  initialNumberOfItems,
  readDefaultValueOnForm = true,
  children,
}: Props<T>) => {
  const didMountRef = useRef(false);
  const uniqueId = useRef(0);

  const form = useFormContext();
  const defaultValues = readDefaultValueOnForm
    ? (form.getFieldDefaultValue(path) as any[])
    : undefined;
  const fieldConfig: FieldConfig<any, T> & { initialValue?: T } =
    config !== undefined
      ? { ...config }
      : ({
          ...form.__readFieldConfigFromSchema(path),
        } as Partial<FieldConfig<any, T>>);

  if (defaultValues !== undefined) {
    // update the form "defaultValue" ref object so when/if we reset the form we can go back to this value
    form.__updateDefaultValueAt(path, defaultValues);

    // Use the defaultValue prop as initial value
    fieldConfig.initialValue = defaultValues as T;
  } else {
    if (readDefaultValueOnForm) {
      // Read the field initial value from the "defaultValue" object passed to the form
      fieldConfig.initialValue = (form.getFieldDefaultValue(path) as T) ?? fieldConfig.defaultValue;
    }
  }
  const field = useField<T>(form, path, fieldConfig);
  const { setValue } = field;

  const getNewItemAtIndex = useCallback(
    (index: number): ArrayItem => ({
      id: uniqueId.current++,
      path: `${path}[${index}]`,
      isNew: true,
    }),
    [path]
  );

  const [items, setItems] = useState<ArrayItem[]>(() => {
    const getInitialItemsFromValues = (values: any[]): ArrayItem[] =>
      values.map((_, index) => ({
        id: uniqueId.current++,
        path: `${path}[${index}]`,
        isNew: false,
      }));

    return defaultValues
      ? getInitialItemsFromValues(defaultValues)
      : new Array(initialNumberOfItems).fill('').map((_, i) => getNewItemAtIndex(i));
  });

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
    setItems((previousItems) => {
      const itemIndex = previousItems.length;
      return [...previousItems, getNewItemAtIndex(itemIndex)];
    });
  }, [setItems, getNewItemAtIndex]);

  const removeItem = useCallback(
    (id: number) => {
      setItems((previousItems) => {
        const updatedItems = previousItems.filter((item) => item.id !== id);
        return updatePaths(updatedItems);
      });
    },
    [setItems, updatePaths]
  );

  const moveItem = useCallback(
    (sourceIdx: number, destinationIdx: number) => {
      setItems((previousItems) => {
        const reorderedItems = euiDragDropReorder(previousItems, sourceIdx, destinationIdx);
        return updatePaths(reorderedItems);
      });
    },
    [setItems, updatePaths]
  );

  useEffect(() => {
    const subscription = form.subscribe((update) => {
      const currentValues = update.data.raw[path];
      const filteredFlattenedValues = Object.entries(update.data.raw).reduce(
        (acc, [key, value]) => {
          if (key.startsWith(path + '[')) {
            return {
              ...acc,
              [key]: value,
            };
          }
          return acc;
        },
        {} as Record<string, any>
      );
      const unflattened = unflattenObject(filteredFlattenedValues);
      const nextValues = (get(unflattened, path) as T) ?? [];
      const shouldUpdate = !isEqual(nextValues, currentValues);
      if (shouldUpdate) {
        setValue(nextValues);
      }
    });
    return subscription.unsubscribe;
  }, [setValue, form, path]);

  useEffect(() => {
    if (didMountRef.current) {
      setItems((prev) => {
        return updatePaths(prev);
      });
    } else {
      didMountRef.current = true;
    }
  }, [path, updatePaths]);

  return children({ field, items, addItem, removeItem, moveItem });
};
