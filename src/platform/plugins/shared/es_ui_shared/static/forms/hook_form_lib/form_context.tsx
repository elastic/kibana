/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';

import { FormHook, FormData } from './types';

const FormContext = createContext<FormHook<any> | undefined>(undefined);

interface Props {
  form: FormHook<any>;
  children: React.ReactNode;
}

export const FormProvider = ({ children, form }: Props) => (
  <FormContext.Provider value={form}>{children}</FormContext.Provider>
);

interface Options {
  throwIfNotFound?: boolean;
}

export const useFormContext = function <T extends FormData = FormData>({
  throwIfNotFound = true,
}: Options = {}) {
  const context = useContext(FormContext) as FormHook<T>;
  if (throwIfNotFound && context === undefined) {
    throw new Error('useFormContext must be used within a <FormProvider />');
  }
  return context;
};
