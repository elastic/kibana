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
import { UiSettingsType } from '@kbn/core-ui-settings-common';
import { SettingType, UiSettingMetadata } from '@kbn/management-settings-types';
import {
  useFieldDefinition,
  getDefaultValue,
} from '@kbn/management-settings-field-definition/storybook';

import { FieldInputProvider } from '../services';
import { FieldInput as Component, FieldInput } from '../field_input';
import { InputProps, OnChangeFn } from '../types';

/**
 * Props for a {@link FieldInput} Storybook story.
 */
export type StoryProps<T extends SettingType> = Pick<InputProps<T>, 'value' | 'isDisabled'>;

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
  isDisabled: boolean;
}

/**
 * Default argument values for a {@link FieldInput} Storybook story.
 */
export const storyArgs = {
  /** True if the field is disabled, false otherwise. */
  isDisabled: false,
};

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
      isDisabled: {
        name: 'Is field disabled?',
      },
      value: {
        name: 'Current saved value',
      },
    },
    decorators: [
      (Story) => (
        <FieldInputProvider showDanger={action('showDanger')}>
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
  const Story = ({ value, isDisabled = false }: StoryProps<typeof type>) => {
    const setting: UiSettingMetadata<typeof type> = {
      type,
      value,
      userValue: value,
      ...params.settingFields,
    };

    const [field, unsavedChange, onChangeFn] = useFieldDefinition(setting);

    const onChange: OnChangeFn<typeof type> = (newChange) => {
      onChangeFn(newChange);
    };
    return (
      <FieldInput
        {...{ field, isInvalid: unsavedChange.isInvalid, unsavedChange, onChange, isDisabled }}
      />
    );
  };

  Story.args = {
    value: getDefaultValue(type),
    ...params.argTypes,
    ...storyArgs,
  };

  return Story;
};
