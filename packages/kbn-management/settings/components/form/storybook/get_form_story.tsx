/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import { Form } from '../form';
import { getSettingsMock, uiSettingsClientMock } from '../mocks';

export interface StoryProps {
  /** True if saving settings is enabled, false otherwise. */
  isSavingEnabled: boolean;
  /** True if settings require page reload, false otherwise. */
  requirePageReload: boolean;
}

/**
 * Utility function for returning a {@link Form} Storybook story.
 * @returns A Storybook Story.
 */
export const getFormStory = () => {
  const Story = ({ isSavingEnabled, requirePageReload }: StoryProps) => {
    const fields: Array<FieldDefinition<SettingType>> = getFieldDefinitions(
      getSettingsMock(requirePageReload),
      uiSettingsClientMock
    );

    return <Form {...{ fields, isSavingEnabled }} />;
  };

  Story.args = {
    isSavingEnabled: true,
    requirePageReload: false,
  };

  return Story;
};
