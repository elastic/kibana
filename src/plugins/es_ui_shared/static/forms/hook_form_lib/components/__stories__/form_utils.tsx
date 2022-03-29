/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC } from 'react';
import { EuiSpacer, EuiButton } from '@elastic/eui';
import { action } from '@storybook/addon-actions';

import { useForm } from '../../hooks/use_form';
import { FormHook, FormConfig } from '../../types';
import { Form } from '../form';

/**
 * Validate the form and return its data.
 *
 * @param form The FormHook instance
 */
export const submitForm = async (form: FormHook) => {
  const { isValid, data } = await form.submit();
  action('Send form')({
    isValid,
    data: JSON.stringify(data),
  });
};

export interface FormWrapperProps {
  formConfig?: FormConfig<any>;
}

export const FormWrapper: FC<FormWrapperProps> = ({ formConfig, children }) => {
  const { form } = useForm(formConfig);

  return (
    <Form form={form}>
      <>
        {children}
        <EuiSpacer />
        <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
      </>
    </Form>
  );
};
