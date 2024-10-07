/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiPanel } from '@elastic/eui';
import { SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';

import {
  KnownTypeToMetadata,
  UiSettingMetadata,
  OnFieldChangeFn,
} from '@kbn/management-settings-types';
import { getDefaultValue, getUserValue } from '@kbn/management-settings-utilities/storybook';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { FieldRow as Component, FieldRow } from '../field_row';
import { FieldRowProvider } from '../services';

/**
 * Props for a {@link FieldInput} Storybook story.
 */
export interface StoryProps<T extends SettingType>
  extends Pick<KnownTypeToMetadata<T>, 'userValue' | 'value'> {
  /** Simulate if the UiSetting is custom. */
  isCustom: boolean;
  /** Simulate if the UiSetting is deprecated. */
  isDeprecated: boolean;
  /** Simulate if the UiSetting is overriden. */
  isOverridden: boolean;
  /** Simulate if saving settings is enabled in the UI. */
  isSavingEnabled: boolean;
}

/**
 * Utility function for returning a {@link FieldRow} Storybook story
 * definition.
 * @param title The title displayed in the Storybook UI.
 * @param description The description of the Story.
 * @returns A Storybook Story.
 */
export const getStory = (
  title: string,
  description: string,
  argTypes: Record<string, unknown> = {}
) =>
  ({
    title: `Settings/Field Row/${title}`,
    description,
    argTypes: {
      userValue: {
        name: 'Current saved value',
      },
      value: {
        name: 'Default value from Kibana',
      },
      isSavingEnabled: {
        name: 'Saving is enabled?',
      },
      isCustom: {
        name: 'Setting is custom?',
      },
      isDeprecated: {
        name: 'Setting is deprecated?',
      },
      isOverridden: {
        name: 'Setting is overridden?',
      },
      ...argTypes,
    },
    decorators: [
      (Story) => (
        <FieldRowProvider
          showDanger={action('showDanger')}
          links={{ deprecationKey: 'link/to/deprecation/docs' }}
          validateChange={async (key, value) => {
            action(`validateChange`)({
              key,
              value,
            });
            return { successfulValidation: true, valid: true };
          }}
        >
          <EuiPanel>
            <Story />
          </EuiPanel>
        </FieldRowProvider>
      ),
    ],
  } as ComponentMeta<typeof Component>);

/**
 * Default argument values for a {@link FieldInput} Storybook story.
 */
export const storyArgs = {
  /** True if the saving settings is disabled, false otherwise. */
  isSavingEnabled: true,
  /** True if the UiSetting is custom, false otherwise. */
  isCustom: false,
  /** True if the UiSetting is deprecated, false otherwise. */
  isDeprecated: false,
  /** True if the UiSetting is overridden, false otherwise. */
  isOverridden: false,
};

/**
 * Utility function for returning a {@link FieldRow} Storybook story.
 * @param type The type of the UiSetting for this {@link FieldRow}.
 * @returns A Storybook Story.
 */
export const getFieldRowStory = (type: SettingType, settingFields?: Partial<UiSettingMetadata>) => {
  const Story = ({
    isCustom,
    isDeprecated,
    isOverridden,
    isSavingEnabled,
    userValue,
    value,
  }: StoryProps<typeof type>) => {
    const [unsavedChange, setUnsavedChange] = useState<
      UnsavedFieldChange<typeof type> | undefined
    >();

    const setting: UiSettingMetadata<typeof type> = {
      type,
      value,
      userValue: userValue === '' ? null : userValue,
      name: `Some ${type} setting`,
      deprecation: isDeprecated
        ? { message: 'This setting is deprecated', docLinksKey: 'storybook' }
        : undefined,
      category: ['categoryOne', 'categoryTwo'],
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu odio velit. Integer et mauris quis ligula elementum commodo. Morbi eu ipsum diam. Nulla auctor orci eget egestas vehicula. Aliquam gravida, dolor eu posuere vulputate, neque enim viverra odio, id viverra ipsum quam et ipsum.',
      requiresPageReload: false,
      ...settingFields,
    };

    const field = getFieldDefinition({
      id: setting.name?.split(' ').join(':').toLowerCase() || setting.type,
      setting,
      params: {
        isCustom,
        isOverridden,
      },
    });

    const onFieldChange: OnFieldChangeFn<typeof type> = (_id, newChange) => {
      setUnsavedChange(newChange);

      action('onFieldChange')({
        type,
        unsavedValue: newChange?.unsavedValue,
        savedValue: field.savedValue,
      });
    };

    return <FieldRow {...{ field, unsavedChange, isSavingEnabled, onFieldChange }} />;
  };

  // In Kibana, the image default value is never anything other than null.  There would be a number
  // of issues if it was anything but, so, in Storybook, we want to remove the default value argument.
  if (type === 'image') {
    Story.args = {
      userValue: getUserValue(type),
      ...storyArgs,
    };
  } else {
    Story.args = {
      userValue: getUserValue(type),
      value: getDefaultValue(type),
      ...storyArgs,
    };
  }

  return Story;
};
