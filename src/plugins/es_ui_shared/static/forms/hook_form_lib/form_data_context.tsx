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

import React, { createContext, useContext, useMemo } from 'react';

import { FormData, FormHook } from './types';
import { Subject } from './lib';

export interface Context<T extends FormData = FormData, I extends FormData = T> {
  getFormData$: () => Subject<FormData>;
  getFormData: FormHook<T, I>['getFormData'];
}

const FormDataContext = createContext<Context<any> | undefined>(undefined);

interface Props extends Context {
  children: React.ReactNode;
}

export const FormDataContextProvider = ({ children, getFormData$, getFormData }: Props) => {
  const value = useMemo<Context>(
    () => ({
      getFormData,
      getFormData$,
    }),
    [getFormData, getFormData$]
  );

  return <FormDataContext.Provider value={value}>{children}</FormDataContext.Provider>;
};

export function useFormDataContext<T extends FormData = FormData, I extends FormData = T>() {
  return useContext<Context<T, I> | undefined>(FormDataContext);
}
