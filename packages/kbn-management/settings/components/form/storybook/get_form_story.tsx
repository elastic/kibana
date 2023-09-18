/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { normalizeSettings } from '@kbn/management-settings-utilities';
import { FieldDefinition, SettingType, UiSetting } from '@kbn/management-settings-types';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { Form } from '../form';
import _settings from './settings.json';

export const getFormStory = () => {
  const Story = () => {
    const settings = _settings as unknown as Record<string, UiSetting<SettingType>>;
    const normalizedSettings = normalizeSettings(settings);
    const fields: Array<FieldDefinition<SettingType>> = Object.entries(normalizedSettings).map(
      ([id, setting]) =>
        getFieldDefinition({
          id,
          setting,
        })
    );
    const isSavingEnabled = true;

    return <Form {...{ fields, isSavingEnabled }} />;
  };

  return Story;
};
