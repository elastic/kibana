/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { EuiButton } from '@elastic/eui';
import { action } from '@storybook/addon-actions';

import { TextField, ToggleField } from '../../../components';
import { useForm } from '../../hooks/use_form';
import { useFormIsModified } from '../../hooks/use_form_is_modified';
import { Form } from '../form';
import { UseField } from '../use_field';
import { titleConfigBase } from './constants';
import { FormArgs } from './types';
import { submitForm } from './form_utils';

export const IsModified = (args: FormArgs) => {
  const { form } = useForm();
  const isFormModified = useFormIsModified({ form });

  useEffect(() => {
    action('Is form modified')(isFormModified);
  }, [isFormModified]);

  return (
    <Form form={form} {...args}>
      <UseField<string>
        path="title"
        defaultValue="Initial value"
        component={TextField}
        config={titleConfigBase}
      />
      <UseField<boolean>
        path="isOn"
        defaultValue={true}
        component={ToggleField}
        config={{ label: 'Is on' }}
      />
      <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
    </Form>
  );
};

IsModified.parameters = {
  docs: {
    source: {
      code: `
const MyFormComponent = () => {
  const { form } = useForm();
  const isFormModified = useFormIsModified({ form });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  useEffect(() => {
    // Do something whenever the form is modified
  }, [isFormModified]);

  return (
    <Form form={form} {...args}>
      <UseField<string>
        path="title"
        defaultValue="Initial value"
        component={TextField}
        config={titleConfigBase}
      />
      <UseField<boolean>
        path="isOn"
        defaultValue={true}
        component={ToggleField}
        config={{ label: 'Is on' }}
      />
      <EuiButton onClick={submitForm}>Send</EuiButton>
    </Form>
  );
};
      `,
      language: 'tsx',
    },
  },
};
