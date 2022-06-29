/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiButton, EuiSpacer } from '@elastic/eui';

import { STORYBOOK_SECTION } from '../constants';
import { FormHook } from '../types';
import { useForm } from '../hooks/use_form';

import { Form } from './form';
import { UseField } from './use_field';
import { UseMultiFields } from './use_multi_fields';
import { useMultiFieldStories } from './__stories__';

const { UseMultiFieldBasic } = useMultiFieldStories;

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

export default {
  component: UseMultiFields,
  title: `${STORYBOOK_SECTION}/UseMultiFields`,
  decorators: [
    (Story) => {
      const { form } = useForm();
      return (
        <div style={{ maxWidth: '600px' }}>
          <Form form={form}>
            <>
              <Story />
              <EuiSpacer />
              <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
            </>
          </Form>
        </div>
      );
    },
  ],
} as ComponentMeta<typeof UseField>;

export { UseMultiFieldBasic };
