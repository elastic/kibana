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

import React, { ReactNode } from 'react';
import { EuiForm } from '@elastic/eui';

import { FormProvider } from '../form_context';
import { FormHook } from '../types';

interface Props {
  form: FormHook<any>;
  FormWrapper?: (props: any) => JSX.Element;
  children: ReactNode | ReactNode[];
  className: string;
}

const DefaultFormWrapper = (props: any) => {
  return <EuiForm {...props} />;
};

export const Form = ({ form, FormWrapper = DefaultFormWrapper, ...rest }: Props) => (
  <FormProvider form={form}>
    <FormWrapper {...rest} />
  </FormProvider>
);
