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
import { useState, useEffect, useRef, useCallback } from 'react';

import { FormData, FormHook } from '../types';
import { useFormDataContext, Context } from '../form_data_context';

interface Options {
  watch?: string | string[];
  form?: FormHook<any>;
}

export type HookReturn<T extends object = FormData> = [FormData, () => T, boolean];

export const useFormData = <T extends object = FormData>(options: Options = {}): HookReturn<T> => {
  const { watch, form } = options;
  const ctx = useFormDataContext<T>();

  let getFormData: Context<T>['getFormData'];
  let getFormData$: Context<T>['getFormData$'];

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
  const [formData, setFormData] = useState<FormData>(previousRawData.current);

  // Create a new instance of the "formatFormData()" handler whenever the "formData" state changes
  // so the consumer can interchangeably declare the "formData" state or the "format()" handler as
  // dependency in his useEffect().
  // This is the reason why we disable the react-hooks/exhaustive-deps rule
  const formatFormData = useCallback(() => {
    return getFormData({ unflatten: true });
  }, [formData, getFormData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const subscription = getFormData$().subscribe((raw) => {
      if (watch) {
        const valuesToWatchArray = Array.isArray(watch)
          ? (watch as string[])
          : ([watch] as string[]);

        if (valuesToWatchArray.some((value) => previousRawData.current[value] !== raw[value])) {
          previousRawData.current = raw;
          // Only update the state if one of the field we watch has changed.
          setFormData(raw);
        }
      } else {
        setFormData(raw);
      }
    });
    return subscription.unsubscribe;
  }, [getFormData$, watch]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (!isMounted.current && Object.keys(formData).length === 0) {
    // No field has mounted yet
    return [formData, formatFormData, false];
  }

  return [formData, formatFormData, true];
};
