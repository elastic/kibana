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
import { action } from '@storybook/addon-actions';

import { TextField } from '../../../components';
import { FieldConfig } from '../../types';
import { useForm } from '../../hooks/use_form';
import { Form } from '../form';
import { UseField } from '../use_field';
import { titleConfigBase } from './constants';
import { FormArgs } from './types';
import { submitForm } from './form_utils';

const titleConfigWithValidation: FieldConfig<string> = {
  ...titleConfigBase,
  helpText: 'Test validation by leaving field empty.',
  validations: [
    {
      validator: ({ value }) => {
        action('Validating title field')(value);

        if (value.trim() === '') {
          return {
            message: `The field can't be empty.`,
          };
        }
      },
    },
  ],
};

export const Validation = (args: FormArgs) => {
  const { form } = useForm();

  return (
    <Form form={form} {...args}>
      <UseField<string> path="title" component={TextField} config={titleConfigWithValidation} />
      <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
    </Form>
  );
};

Validation.parameters = {
  docs: {
    source: {
      code: `
const titleConfigWithValidation: FieldConfig<string> = {
  label: 'Title',
  helpText: 'Test validation by leaving field empty.',
  validations: [
    {
      validator: ({ value }) => {
        action('Validating title field')(value);

        if (value.trim() === '') {
          return {
            message: "The field can't be empty.",
          };
        }
      },
    },
  ],
};

const MyFormComponent = () => {
  const { form } = useForm();

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form}>
      <UseField<string> path="title" component={TextField} config={titleConfigWithValidation} />
      <EuiButton onClick={submitForm}>Send</EuiButton>
    </Form>
  );
};
      `,
      language: 'tsx',
    },
  },
};
