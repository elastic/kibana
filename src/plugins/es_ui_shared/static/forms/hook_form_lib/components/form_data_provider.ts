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

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { FormData } from '../types';
import { useFormContext } from '../form_context';

interface Props {
  children: (formData: FormData) => JSX.Element | null;
  pathsToWatch?: string | string[];
}

export const FormDataProvider = React.memo(({ children, pathsToWatch }: Props) => {
  const form = useFormContext();
  const { subscribe } = form;
  const previousRawData = useRef<FormData>(form.__getFormData$().value);
  const isMounted = useRef(false);
  const [formData, setFormData] = useState<FormData>(previousRawData.current);

  const onFormData = useCallback(
    ({ data: { raw } }) => {
      // To avoid re-rendering the children for updates on the form data
      // that we are **not** interested in, we can specify one or multiple path(s)
      // to watch.
      if (pathsToWatch) {
        const valuesToWatchArray = Array.isArray(pathsToWatch)
          ? (pathsToWatch as string[])
          : ([pathsToWatch] as string[]);

        if (valuesToWatchArray.some((value) => previousRawData.current[value] !== raw[value])) {
          previousRawData.current = raw;
          setFormData(raw);
        }
      } else {
        setFormData(raw);
      }
    },
    [pathsToWatch]
  );

  useEffect(() => {
    const subscription = subscribe(onFormData);
    return subscription.unsubscribe;
  }, [subscribe, onFormData]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (!isMounted.current && Object.keys(formData).length === 0) {
    // No field has mounted yet, don't render anything
    return null;
  }

  return children(formData);
});
