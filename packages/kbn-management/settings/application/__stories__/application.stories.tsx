/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentMeta, Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { Subscription } from 'rxjs';
import {
  getGlobalSettingsMock,
  getSettingsMock,
} from '@kbn/management-settings-utilities/mocks/settings.mock';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import { getSettingsCapabilitiesMock } from '@kbn/management-settings-utilities/mocks/capabilities.mock';
import { SettingsApplication as Component } from '../application';
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

/**
 * Props for a {@link SettinggApplication} Storybook story.
 */
export interface StoryProps {
  hasGlobalSettings: boolean;
}

const getSettingsApplicationStory = ({ hasGlobalSettings }: StoryProps) => (
  <SettingsApplicationProvider
    showDanger={action('showDanger')}
    links={{ deprecationKey: 'link/to/deprecation/docs' }}
    getAllowlistedSettings={(scope: UiSettingsScope) =>
      scope === 'namespace' ? getSettingsMock() : hasGlobalSettings ? getGlobalSettingsMock() : {}
    }
    getSections={() => []}
    // @ts-ignore
    getToastsService={() => null}
    getCapabilities={getSettingsCapabilitiesMock}
    setBadge={() => {}}
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

export const SettingsApplicationWithGlobalSettings: Story = () =>
  getSettingsApplicationStory({
    hasGlobalSettings: true,
  });

export const SettingsApplicationWithoutGlobal: Story = () =>
  getSettingsApplicationStory({
    hasGlobalSettings: false,
  });
