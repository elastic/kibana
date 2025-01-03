/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

import { TextField } from '../../../components';
import { useForm } from '../../hooks/use_form';
import { Form } from '../form';
import { UseField } from '../use_field';
import { titleConfigBase } from './constants';
import { FormArgs } from './types';
import { submitForm } from './form_utils';

// The defaultValue would probably come from an HTTP request
const formDefaultValue = { title: 'Title of the post' };

export const DefaultValue = (args: FormArgs) => {
  const { form } = useForm({ defaultValue: formDefaultValue });

  return (
    <Form form={form} {...args}>
      <UseField<string> path="title" component={TextField} config={{ ...titleConfigBase }} />
      <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
    </Form>
  );
};

DefaultValue.parameters = {
  docs: {
    source: {
      code: `
// The defaultValue would probably come from an HTTP request
const formDefaultValue = { title: 'Title of the post' };

const MyFormComponent = () => {
  const { form } = useForm({ defaultValue: formDefaultValue });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form}>
      <UseField<string> path="title" component={TextField} config={{ ...titleConfigBase }} />
      <EuiButton onClick={submitForm}>Send</EuiButton>
    </Form>
  );
};
      `,
      language: 'tsx',
    },
  },
};
