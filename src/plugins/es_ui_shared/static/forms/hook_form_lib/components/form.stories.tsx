/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { ComponentMeta } from '@storybook/react';
import { EuiButton } from '@elastic/eui';

import { action } from '@storybook/addon-actions';
import { TextField } from '../../components';
import { STORYBOOK_SECTION } from '../constants';
import { FormHook, FieldConfig } from '../types';
import { useForm } from '../hooks/use_form';
import { Form, Props as FormProps } from './form';
import { UseField } from './use_field';
import { formStories } from './__stories__';

export default {
  component: Form,
  title: `${STORYBOOK_SECTION}/Form`,
  subcomponents: { UseField },
  decorators: [(Story) => <div style={{ maxWidth: '600px' }}>{Story()}</div>],
  parameters: {
    controls: { hideNoControlsWarning: true },
  },
} as ComponentMeta<typeof Form>;

type Args = Pick<FormProps, 'children' | 'FormWrapper'>;

const { DefaultValue, Validation, DeSerializer, IsModified, GlobalFields } = formStories;

/**
 * Validate the form and return its data.
 *
 * @param form The FormHook instance
 */
const submitForm = async (form: FormHook) => {
  const { isValid, data } = await form.submit();
  action('Send form')({
    isValid,
    data: JSON.stringify(data),
  });
};

/**
 * The "title" field base configuration
 */
const titleConfigBase: FieldConfig<string> = {
  label: 'Title',
  helpText: 'This is a help text for the field.',
};

// --- SIMPLE

export const Simple = (args: Args) => {
  const { form } = useForm();

  return (
    <Form form={form} {...args}>
      <UseField<string>
        path="title"
        component={TextField}
        config={{
          ...titleConfigBase,
        }}
      />
      <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
    </Form>
  );
};

Simple.parameters = {
  docs: {
    source: {
      code: `
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
      <UseField<string>
        path="title"
        component={TextField}
        config={{
          label: 'Title',
          helpText: 'This is a help text for the field.',
        }}
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

// --- FORM SCHEMA

const formSchema = {
  title: {
    ...titleConfigBase,
  },
};

export const Schema = (args: Args) => {
  const { form } = useForm({
    schema: formSchema,
  });

  return (
    <Form form={form} {...args}>
      <UseField<string> path="title" component={TextField} />
      <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
    </Form>
  );
};

Schema.parameters = {
  docs: {
    source: {
      code: `
const formSchema = {
  title: {
    label: 'Title',
    helpText: 'This is a help text for the field.',
  },
};

const MyFormComponent = () => {
  const { form } = useForm({
    schema: formSchema,
  });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form}>
      <UseField<string> path="title" component={TextField} />
      <EuiButton onClick={submitForm}>Send</EuiButton>
    </Form>
  );
};
      `,
      language: 'tsx',
    },
  },
};

export { DefaultValue, Validation, DeSerializer, IsModified, GlobalFields };
