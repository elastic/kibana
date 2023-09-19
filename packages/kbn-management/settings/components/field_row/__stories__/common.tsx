/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiPanel } from '@elastic/eui';
import { SettingType } from '@kbn/management-settings-types';

import { KnownTypeToMetadata, UiSettingMetadata } from '@kbn/management-settings-types/metadata';
import {
  useFieldDefinition,
  getDefaultValue,
  getUserValue,
} from '@kbn/management-settings-field-definition/storybook';
import { FieldRow as Component, FieldRow } from '../field_row';
import { FieldRowProvider } from '../services';
import { OnChangeFn } from '../types';

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
export const getFieldRowStory = (
  type: SettingType,
  settingFields: Partial<UiSettingMetadata<SettingType>>
) => {
  const Story = ({
    isCustom,
    isDeprecated,
    isOverridden,
    isSavingEnabled,
    userValue,
    value,
  }: StoryProps<typeof type>) => {
    const setting: UiSettingMetadata<typeof type> = {
      type,
      value,
      userValue,
      name: `Some ${type} setting`,
      ...settingFields,
    };

    const [field, unsavedChange, onChangeFn] = useFieldDefinition(setting, {
      isCustom,
      isDeprecated,
      isOverridden,
    });

    const onChange: OnChangeFn<typeof type> = (_key, change) => {
      const { error, isInvalid, unsavedValue } = change;
      onChangeFn({ error: error === null ? undefined : error, isInvalid, value: unsavedValue });
    };

    return <FieldRow {...{ field, unsavedChange, isSavingEnabled, onChange }} />;
  };

  Story.args = {
    userValue: getUserValue(type),
    value: getDefaultValue(type),
    ...storyArgs,
  };

  return Story;
};
