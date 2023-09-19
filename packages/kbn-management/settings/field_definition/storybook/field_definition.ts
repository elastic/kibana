/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState } from 'react';
import isEqual from 'lodash/isEqual';

import { action } from '@storybook/addon-actions';

import type {
  FieldDefinition,
  KnownTypeToValue,
  SettingType,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';

import { UiSettingMetadata } from '@kbn/management-settings-types/metadata';
import { getFieldDefinition } from '../get_definition';

/**
 * Expand a typed {@link UiSettingMetadata} object with common {@link UiSettingMetadata} properties.
 */
const expandSetting = <T extends SettingType>(
  setting: UiSettingMetadata<T>
): UiSettingMetadata<T> => {
  const { type } = setting;
  return {
    ...setting,
    category: ['categoryOne', 'categoryTwo'],
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu odio velit. Integer et mauris quis ligula elementum commodo. Morbi eu ipsum diam. Nulla auctor orci eget egestas vehicula. Aliquam gravida, dolor eu posuere vulputate, neque enim viverra odio, id viverra ipsum quam et ipsum.',
    name: `Some ${type} setting`,
    requiresPageReload: false,
  };
};

interface OnChangeParams<T extends SettingType> {
  value?: KnownTypeToValue<T> | null;
  isInvalid?: boolean;
  error?: string;
}

type OnChangeFn<T extends SettingType> = (params: OnChangeParams<T> | null) => void;

/**
 * Hook to build and maintain a {@link FieldDefinition} for a given {@link UiSettingMetadata} object
 * for use in Storybook.  It provides the {@link FieldDefinition}, a stateful
 * {@link UnsavedFieldChange} object, and an {@link OnChangeFn} to update the unsaved change based
 * on the action taken within a {@link FieldInput} or {@link FieldRow}.
 */
export const useFieldDefinition = <T extends SettingType>(
  baseSetting: UiSettingMetadata<T>,
  params: { isCustom?: boolean; isOverridden?: boolean; isDeprecated?: boolean } = {}
): [FieldDefinition<T>, UnsavedFieldChange<T>, OnChangeFn<T>] => {
  const setting = {
    ...expandSetting(baseSetting),
    deprecation: params.isDeprecated
      ? { message: 'This setting is deprecated', docLinksKey: 'storybook' }
      : undefined,
  };

  const field = getFieldDefinition<T>({
    id: setting.name?.split(' ').join(':').toLowerCase() || setting.type,
    setting,
    params,
  });

  const { type, savedValue } = field;

  const [unsavedChange, setUnsavedChange] = useState<UnsavedFieldChange<T>>({ type });

  const onChange: OnChangeFn<T> = (change) => {
    if (!change) {
      return;
    }

    const { value, error, isInvalid } = change;

    if (isEqual(value, savedValue)) {
      setUnsavedChange({ type });
    } else {
      setUnsavedChange({ type, unsavedValue: value, error, isInvalid });
    }

    const formattedSavedValue = type === 'image' ? String(savedValue).slice(0, 25) : savedValue;
    const formattedUnsavedValue = type === 'image' ? String(value).slice(0, 25) : value;

    action('onChange')({
      type,
      unsavedValue: formattedUnsavedValue,
      savedValue: formattedSavedValue,
    });
  };

  return [field, unsavedChange, onChange];
};
