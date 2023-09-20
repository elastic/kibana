/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { Form, FormProps } from '../form';
import { settingsMock } from '../mocks';

export type StoryProps = Pick<FormProps, 'isSavingEnabled'>;

/**
 * Utility function for returning a {@link Form} Storybook story.
 * @returns A Storybook Story.
 */
export const getFormStory = () => {
  const Story = ({ isSavingEnabled }: StoryProps) => {
    const fields: Array<FieldDefinition<SettingType>> = Object.entries(settingsMock).map(
      ([id, setting]) =>
        getFieldDefinition({
          id,
          setting,
        })
    );

    return <Form {...{ fields, isSavingEnabled }} />;
  };

  Story.args = {
    isSavingEnabled: true,
  };

  return Story;
};
