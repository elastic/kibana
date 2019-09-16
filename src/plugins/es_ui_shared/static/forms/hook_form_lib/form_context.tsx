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

import React, { createContext, useContext } from 'react';

import { FormHook } from './types';

const FormContext = createContext<FormHook<any> | undefined>(undefined);

interface Props {
  form: FormHook<any>;
  children: React.ReactNode;
}

export const FormProvider = ({ children, form }: Props) => (
  <FormContext.Provider value={form}>{children}</FormContext.Provider>
);

export const useFormContext = function<T = Record<string, unknown>>() {
  const context = useContext(FormContext) as FormHook<T>;
  if (context === undefined) {
    throw new Error('useFormContext must be used within a <FormProvider />');
  }
  return context;
};
