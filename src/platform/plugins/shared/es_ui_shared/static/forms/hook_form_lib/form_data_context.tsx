/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo } from 'react';

import type { FormData, FormHook } from './types';
import type { Subject } from './lib';

/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
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
 *
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
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

/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export function useFormDataContext<T extends FormData = FormData, I extends FormData = T>() {
  return useContext<Context<T, I> | undefined>(FormDataContext);
}
