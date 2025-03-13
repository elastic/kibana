/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { ComponentMeta } from '@storybook/react';
import { FieldDefinition } from '@kbn/management-settings-types';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import { getSettingsMock } from '@kbn/management-settings-utilities/mocks/settings.mock';

import { categorizeFields } from '@kbn/management-settings-utilities';
import { uiSettingsClientMock } from '../mocks';
import { Form as Component } from '../form';
import { FormProvider } from '../services';

export default {
  title: `Settings/Form/Form`,
  description: 'A form with field rows',
  argTypes: {
    isSavingEnabled: {
      name: 'Saving is enabled?',
      control: { type: 'boolean' },
    },
    requirePageReload: {
      name: 'Settings require page reload?',
      control: { type: 'boolean' },
    },
  },
  decorators: [
    (Story) => (
      <FormProvider
        showDanger={action('showDanger')}
        links={{ deprecationKey: 'link/to/deprecation/docs' }}
        saveChanges={action('saveChanges')}
        showError={action('showError')}
        showReloadPagePrompt={action('showReloadPagePrompt')}
        validateChange={async (key, value) => {
          action(`validateChange`)({
            key,
            value,
          });
          return { successfulValidation: true, valid: true };
        }}
      >
        <Story />
      </FormProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'ghost',
    },
  },
} as ComponentMeta<typeof Component>;

interface FormStoryProps {
  /** True if saving settings is enabled, false otherwise. */
  isSavingEnabled: boolean;
  /** True if settings require page reload, false otherwise. */
  requirePageReload: boolean;
}

export const Form = ({ isSavingEnabled, requirePageReload }: FormStoryProps) => {
  const fields: FieldDefinition[] = getFieldDefinitions(
    getSettingsMock(requirePageReload),
    uiSettingsClientMock
  );

  const categorizedFields = categorizeFields(fields);

  const categoryCounts = Object.keys(categorizedFields).reduce(
    (acc, category) => ({
      ...acc,
      [category]: categorizedFields[category].count,
    }),
    {}
  );

  const onClearQuery = () => {};

  return (
    <Component {...{ fields, isSavingEnabled, categoryCounts, onClearQuery, scope: 'namespace' }} />
  );
};

Form.args = {
  isSavingEnabled: true,
  requirePageReload: false,
};
