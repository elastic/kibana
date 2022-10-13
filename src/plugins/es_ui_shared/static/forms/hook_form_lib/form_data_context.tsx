/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, useMemo } from 'react';

import { FormData, FormHook } from './types';
import { Subject } from './lib';

export interface Context<T extends FormData = FormData, I extends FormData = T> {
  getFormData$: () => Subject<FormData>;
  getFormData: FormHook<T, I>['getFormData'];
}

/**
 * Context required for the "useFormData()" hook in order to access the form data
 * observable and the getFormData() handler which serializes the form data
 */
const FormDataContext = createContext<Context<any> | undefined>(undefined);

interface Props extends Context {
  children: React.ReactNode;
}

/**
 * This provider wraps the whole form and is consumed by the <Form /> component
 */
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
