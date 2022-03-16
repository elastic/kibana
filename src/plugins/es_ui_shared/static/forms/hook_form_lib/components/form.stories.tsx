/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { ComponentMeta } from '@storybook/react';
import { EuiButton } from '@elastic/eui';

import { action } from '@storybook/addon-actions';
import { TextField } from '../../components';
import { STORYBOOK_SECTION } from '../constants';
import { FormHook, FieldConfig } from '../types';
import { useForm } from '../hooks/use_form';
import { useFormData } from '../hooks/use_form_data';
import { Form, Props as FormProps } from './form';
import { UseField } from './use_field';

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

// --- DEFAULT VALUE

// The defaultValue would probably come from an HTTP request
const formDefaultValue = { title: 'Title of the post' };

export const DefaultValue = (args: Args) => {
  const { form } = useForm({ defaultValue: formDefaultValue });

  return (
    <Form form={form} {...args}>
      <UseField<string> path="title" component={TextField} config={{ ...titleConfigBase }} />
      <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
    </Form>
  );
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

// --- CHANGE LISTENERS

/**
 * This Story outputs the order in which different state update
 * and events occur whenever the field value changes.
 */
export const ChangeListeners = (args: Args) => {
  const { form } = useForm();

  const onFieldChangeHook = ({ title }: { title: string }) => {
    action('1. useFormData() -> onChange() handler')(title);
  };
  const [{ title }] = useFormData({ form, watch: 'title', onChange: onFieldChangeHook });

  const onFieldChangeProp = (value: string) => {
    action('2. onChange() prop handler')(value);
  };

  useEffect(() => {
    action('4. useEffect() "title" changed')(title);
  }, [title]);

  return (
    <Form form={form} {...args}>
      <UseField<string>
        path="title"
        component={TextField}
        config={{
          ...titleConfigBase,
          validations: [
            {
              validator: ({ value }) => {
                action('3. Validating "title" field')(value);
              },
            },
          ],
        }}
        onChange={onFieldChangeProp}
      />
      <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
    </Form>
  );
};
