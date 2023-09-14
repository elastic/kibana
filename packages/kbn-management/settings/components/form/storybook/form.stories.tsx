/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import { ComponentMeta } from '@storybook/react';
import { FormProvider } from '../services';
import { getFormStory } from './get_form_story';
import { Form as Component } from '../form';

export default {
  title: `Settings/Form/Form`,
  description: 'A form with field rows',
  argTypes: { save: { action: 'Saved' } },
  decorators: [
    (Story) => (
      <FormProvider
        showDanger={action('showDanger')}
        links={{ deprecationKey: 'link/to/deprecation/docs' }}
      >
        <EuiPanel>
          <Story />
        </EuiPanel>
      </FormProvider>
    ),
  ],
} as ComponentMeta<typeof Component>;

export const Form = getFormStory();
