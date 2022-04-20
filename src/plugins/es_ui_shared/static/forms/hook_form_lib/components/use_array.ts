/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

let uniqueId = 0;

export const createArrayItem = (path: string, index: number, isNew = true): ArrayItem => ({
  id: uniqueId++,
  path: `${path}[${index}]`,
  isNew,
});

/**
 * We create an internal field to represent the Array items. This field is not returned
 * as part as the form data but is used internally to run validation on the array items.
 * It is this internal field value (ArrayItem[]) that we then map to actual form fields
 * (in the children func <UseArray>{({ items }) => (...)}</UseArray>)
 *
 * @param path The array path in the form data
 * @returns The internal array field path
 */
export const getInternalArrayFieldPath = (path: string): string => `${path}__array__`;

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
 * and you want to be able to add user objects (e.g. { name: 'john', lastName. 'snow' }) inside
 * the "users" array, you would use UseArray to render rows of user objects with 2 fields in each of them ("name" and "lastName")
 *
 * Look at the README.md for some examples.
 */
export const UseArray = ({
  path,
  initialNumberOfItems = 1,
  validations,
  readDefaultValueOnForm = true,
  children,
}: Props) => {
  const isMounted = useRef(false);

  const form = useFormContext();
  const { getFieldDefaultValue } = form;

  const fieldDefaultValue = useMemo<ArrayItem[]>(() => {
    const defaultValues = readDefaultValueOnForm
      ? getFieldDefaultValue<unknown[]>(path)
      : undefined;

    if (defaultValues) {
      return defaultValues.map((_, index) => createArrayItem(path, index, false));
    }

    return new Array(initialNumberOfItems).fill('').map((_, i) => createArrayItem(path, i));
  }, [path, initialNumberOfItems, readDefaultValueOnForm, getFieldDefaultValue]);

  // Create an internal hook field which behaves like any other form field except that it is not
  // outputed in the form data (when calling form.submit() or form.getFormData())
  // This allow us to run custom validations (passed to the props) on the Array items
  const internalFieldPath = useMemo(() => getInternalArrayFieldPath(path), [path]);

  const fieldConfigBase: FieldConfig<ArrayItem[]> & InternalFieldConfig<ArrayItem[]> = {
    defaultValue: fieldDefaultValue,
    initialValue: fieldDefaultValue,
    valueChangeDebounceTime: 0,
    isIncludedInOutput: false, // indicate to not include this field when returning the form data
  };

  const fieldConfig: FieldConfig<ArrayItem[]> & InternalFieldConfig<ArrayItem[]> = validations
    ? { validations, ...fieldConfigBase }
    : fieldConfigBase;

  const field = useField(form, internalFieldPath, fieldConfig);
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
      return [...previousItems, createArrayItem(path, itemIndex)];
    });
  }, [setValue, path]);

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
