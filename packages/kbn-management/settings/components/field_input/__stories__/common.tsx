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
import { UiSettingsType } from '@kbn/core-ui-settings-common';
import {
  OnInputChangeFn,
  SettingType,
  UiSettingMetadata,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';

import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { getDefaultValue, getUserValue } from '@kbn/management-settings-utilities/storybook';
import { FieldInputProvider } from '../services';
import { FieldInput as Component, FieldInput } from '../field_input';
import { InputProps } from '../types';

/**
 * Props for a {@link FieldInput} Storybook story.
 */
export type StoryProps<T extends SettingType> = Pick<InputProps<T>, 'isSavingEnabled'> &
  Pick<UiSettingMetadata<T>, 'value' | 'userValue'>;

/**
 * Interface defining available {@link https://storybook.js.org/docs/react/writing-stories/parameters parameters}
 * for a {@link FieldInput} Storybook story.
 */
interface Params {
  argTypes?: Record<string, unknown>;
  settingFields?: Partial<UiSettingMetadata<UiSettingsType>>;
}

/**
 * Interface defining types for available {@link https://storybook.js.org/docs/react/writing-stories/args arguments}
 * for a {@link FieldInput} Storybook story.
 */
export interface Args {
  /** True if the field is disabled, false otherwise. */
  isSavingEnabled: boolean;
  userValue: unknown;
  value: unknown;
}

/**
 * Utility function for returning a {@link FieldInput} Storybook story
 * definition.
 * @param title The title displayed in the Storybook UI.
 * @param description The description of the story.
 * @returns A Storybook Story.
 */
export const getStory = (title: string, description: string) =>
  ({
    title: `Settings/Field Input/${title}`,
    description,
    argTypes: {
      isSavingEnabled: {
        name: 'Is saving enabled?',
      },
      value: {
        name: 'Default value',
      },
      userValue: {
        name: 'Current saved value',
      },
    },
    decorators: [
      (Story) => (
        <FieldInputProvider
          showDanger={action('showDanger')}
          validateChange={async (key, value) => {
            action(`validateChange`)({
              key,
              value,
            });
            return { successfulValidation: true, valid: true };
          }}
        >
          <EuiPanel style={{ width: 500 }}>
            <Story />
          </EuiPanel>
        </FieldInputProvider>
      ),
    ],
  } as ComponentMeta<typeof Component>);

/**
 * Utility function for returning a {@link FieldInput} Storybook story.
 * @param type The type of the UiSetting for this {@link FieldRow}.
 * @param params Additional, optional {@link https://storybook.js.org/docs/react/writing-stories/parameters parameters}.
 * @returns A Storybook Story.
 */
export const getInputStory = (type: SettingType, params: Params = {}) => {
  const Story = ({ userValue, value, isSavingEnabled }: StoryProps<typeof type>) => {
    const [unsavedChange, setUnsavedChange] = useState<
      UnsavedFieldChange<typeof type> | undefined
    >();

    const setting: UiSettingMetadata<typeof type> = {
      type,
      value,
      userValue,
      ...params.settingFields,
    };

    const field = getFieldDefinition({
      id: setting.name?.split(' ').join(':').toLowerCase() || setting.type,
      setting,
    });

    const onInputChange: OnInputChangeFn<typeof type> = (newChange) => {
      setUnsavedChange(newChange);

      action('onInputChange')({
        type,
        unsavedValue: newChange?.unsavedValue,
        savedValue: field.savedValue,
      });
    };

    return <FieldInput {...{ field, unsavedChange, onInputChange, isSavingEnabled }} />;
  };

  Story.argTypes = {
    ...params.argTypes,
  };

  Story.args = {
    isSavingEnabled: true,
    value: getDefaultValue(type),
    userValue: getUserValue(type),
    ...params.argTypes,
  };

  return Story;
};
