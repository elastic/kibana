/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { ComponentMeta, Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { Subscription } from 'rxjs';
import { SettingsApplication as Component } from '../application';
import { useApplicationStory } from './use_application_story';
import { SettingsApplicationProvider } from '../services';

export default {
  title: 'Settings/Settings Application',
  description: '',
  parameters: {
    backgrounds: {
      default: 'ghost',
    },
  },
} as ComponentMeta<typeof Component>;

export const SettingsApplication: Story = () => {
  const { getAllowListedSettings } = useApplicationStory();

  return (
    <SettingsApplicationProvider
      showDanger={action('showDanger')}
      links={{ deprecationKey: 'link/to/deprecation/docs' }}
      getAllowlistedSettings={getAllowListedSettings}
      isCustomSetting={() => false}
      isOverriddenSetting={() => false}
      saveChanges={action('saveChanges')}
      showError={action('showError')}
      showReloadPagePrompt={action('showReloadPagePrompt')}
      subscribeToUpdates={() => new Subscription()}
      addUrlToHistory={action('addUrlToHistory')}
      validateChange={async (key, value) => {
        action(`validateChange`)({
          key,
          value,
        });
        return { successfulValidation: true, valid: true };
      }}
    >
      <Component />
    </SettingsApplicationProvider>
  );
};
