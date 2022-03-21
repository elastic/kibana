/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { ComponentMeta } from '@storybook/react';
import { EuiButton, EuiSpacer } from '@elastic/eui';

import { STORYBOOK_SECTION } from '../constants';
import { useForm } from '../hooks/use_form';
import { Form } from './form';
import { UseArray } from './use_array';

import { useArrayStories, helpers } from './storybook';

const { UseArrayBasic } = useArrayStories;
const { submitForm } = helpers;

const defaultValue = {
  employees: [
    {
      name: 'John',
      lastName: 'Snow',
    },
  ],
};

export default {
  component: UseArray,
  title: `${STORYBOOK_SECTION}/UseArray`,
  decorators: [
    (Story) => {
      const { form } = useForm({ defaultValue });
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
} as ComponentMeta<typeof UseArray>;

export { UseArrayBasic };
