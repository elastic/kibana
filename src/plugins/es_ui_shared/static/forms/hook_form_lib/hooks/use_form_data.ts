/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

import { FormData, FormHook } from '../types';
import { unflattenObject } from '../lib';
import { useFormDataContext, Context } from '../form_data_context';

interface Options<I> {
  watch?: string | string[];
  form?: FormHook<any>;
  /**
   * Use this handler if you want to listen to field value change
   * before the validations are ran.
   */
  onChange?: (formData: I) => void;
}

export type HookReturn<I extends object = FormData, T extends object = I> = [I, () => T, boolean];

export const useFormData = <I extends object = FormData, T extends object = I>(
  options: Options<I> = {}
): HookReturn<I, T> => {
  const { watch, form, onChange } = options;
  const ctx = useFormDataContext<T, I>();
  const watchToArray: string[] = watch === undefined ? [] : Array.isArray(watch) ? watch : [watch];
  // We will use "stringifiedWatch" to compare if the array has changed in the useMemo() below
  const stringifiedWatch = watchToArray.join('.');

  let getFormData: Context<T, I>['getFormData'];
  let getFormData$: Context<T, I>['getFormData$'];

  if (form !== undefined) {
    getFormData = form.getFormData;
    getFormData$ = form.__getFormData$;
  } else if (ctx !== undefined) {
    ({ getFormData, getFormData$ } = ctx);
  } else {
    throw new Error(
      'useFormData() must be used within a <FormDataContextProvider /> or you need to pass FormHook object in the options.'
    );
  }

  const initialValue = getFormData$().value;

  const previousRawData = useRef<FormData>(initialValue);
  const isMounted = useRef(false);
  const [formData, setFormData] = useState<I>(() => unflattenObject<I>(previousRawData.current));

  /**
   * We do want to offer to the consumer a handler to serialize the form data that changes each time
   * the formData **state** changes. This is why we added the "formData" dep to the array and added the eslint override.
   */
  const serializer = useCallback(() => {
    return getFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getFormData, formData]);

  useEffect(() => {
    const subscription = getFormData$().subscribe((raw) => {
      if (!isMounted.current && Object.keys(raw).length === 0) {
        return;
      }

      if (watchToArray.length > 0) {
        // Only update the state if one of the field we watch has changed.
        if (watchToArray.some((path) => previousRawData.current[path] !== raw[path])) {
          previousRawData.current = raw;
          const nextState = unflattenObject<I>(raw);

          if (onChange) {
            onChange(nextState);
          }

          setFormData(nextState);
        }
      } else {
        const nextState = unflattenObject<I>(raw);
        if (onChange) {
          onChange(nextState);
        }
        setFormData(nextState);
      }
    });

    return subscription.unsubscribe;

    // To compare we use the stringified version of the "watchToArray" array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringifiedWatch, getFormData$, onChange]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (!isMounted.current && Object.keys(formData).length === 0) {
    // No field has mounted yet
    return [formData, serializer, false];
  }

  return [formData, serializer, true];
};
