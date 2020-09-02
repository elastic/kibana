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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { euiDragDropReorder } from '@elastic/eui';

import { FieldConfig, FormData, FieldHook } from '../types';
import { useFormContext } from '../form_context';
import { useField, useFormData } from '../hooks';

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
  const didInitFieldRef = useRef(false);
  const form = useFormContext();
  const defaultValues = readDefaultValueOnForm && (form.getFieldDefaultValue(path) as any[]);
  const uniqueId = useRef(0);

  const getInitialItemsFromValues = (values: any[]): ArrayItem[] =>
    values.map((_, index) => ({
      id: uniqueId.current++,
      path: `${path}[${index}]`,
      isNew: false,
    }));

  const getNewItemAtIndex = useCallback(
    (index: number): ArrayItem => ({
      id: uniqueId.current++,
      path: `${path}[${index}]`,
      isNew: true,
    }),
    [path]
  );

  const initialState = defaultValues
    ? getInitialItemsFromValues(defaultValues)
    : new Array(initialNumberOfItems).fill('').map((_, i) => getNewItemAtIndex(i));

  const [items, setItems] = useState<ArrayItem[]>(initialState);
  const paths = useMemo<string[]>(() => {
    return items.map((item) => item.path);
  }, [items]);

  const field = useField<T>(form, path, config);
  const { setValue, reset } = field;
  const [formData] = useFormData({ watch: paths });

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
    if (didInitFieldRef.current) {
      setValue(
        items.map((item) => {
          return formData[item.path];
        }) as T
      );
    }
  }, [formData, setValue, items]);

  useEffect(() => {
    if (didMountRef.current && !didInitFieldRef.current) {
      reset({
        resetValue: true,
        defaultValue: items.map((item) => {
          return formData[item.path];
        }) as T,
      });
      didInitFieldRef.current = true;
    }
  }, [reset, items, formData]);

  useEffect(() => {
    if (didMountRef.current) {
      setItems((prev) => {
        return updatePaths(prev);
      });
    } else {
      didMountRef.current = true;
    }
  }, [path, updatePaths, reset]);

  return children({ field, items, addItem, removeItem, moveItem });
};
