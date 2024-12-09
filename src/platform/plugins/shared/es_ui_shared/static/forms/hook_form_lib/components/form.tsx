/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { EuiForm } from '@elastic/eui';

import { FormProvider } from '../form_context';
import { FormDataContextProvider } from '../form_data_context';
import { FormHook } from '../types';

export interface Props {
  form: FormHook<any>;
  FormWrapper?: React.ComponentType<React.PropsWithChildren<any>>;
  children: ReactNode | ReactNode[];
  [key: string]: any;
}

export const Form = ({ form, FormWrapper = EuiForm, ...rest }: Props) => {
  const { getFormData, __getFormData$ } = form;

  return (
    <FormDataContextProvider getFormData={getFormData} getFormData$={__getFormData$}>
      <FormProvider form={form}>
        <FormWrapper {...rest} />
      </FormProvider>
    </FormDataContextProvider>
  );
};
