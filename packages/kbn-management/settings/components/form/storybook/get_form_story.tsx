/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { FieldDefinition, KnownTypeToMetadata, SettingType } from '@kbn/management-settings-types';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { Form, FormProps } from '../form';

const defaults = {
  requiresPageReload: false,
  readonly: false,
  category: ['category'],
};

type Settings = {
  [key in SettingType]: KnownTypeToMetadata<key>;
};

const settings: Settings = {
  array: {
    description: 'Description for Array test setting',
    name: 'array:test:setting',
    type: 'array',
    userValue: null,
    value: ['example_value'],
    ...defaults,
  },
  boolean: {
    description: 'Description for Boolean test setting',
    name: 'boolean:test:setting',
    type: 'boolean',
    userValue: null,
    value: true,
    ...defaults,
  },
  color: {
    description: 'Description for Color test setting',
    name: 'color:test:setting',
    type: 'color',
    userValue: null,
    value: '#FF00CC',
    ...defaults,
  },
  image: {
    description: 'Description for Image test setting',
    name: 'image:test:setting',
    type: 'image',
    userValue: null,
    value: '',
    ...defaults,
  },
  number: {
    description: 'Description for Number test setting',
    name: 'number:test:setting',
    type: 'number',
    userValue: null,
    value: 1,
    ...defaults,
  },
  json: {
    name: 'json:test:setting',
    description: 'Description for Json test setting',
    type: 'json',
    userValue: '{"foo": "bar"}',
    value: '{"foo": "bar"}',
    ...defaults,
  },
  markdown: {
    name: 'markdown:test:setting',
    description: 'Description for Markdown test setting',
    type: 'markdown',
    userValue: null,
    value: '',
    ...defaults,
  },
  select: {
    description: 'Description for Select test setting',
    name: 'select:test:setting',
    options: ['apple', 'orange', 'banana'],
    optionLabels: {
      apple: 'Apple',
      orange: 'Orange',
      banana: 'Banana',
    },
    type: 'select',
    userValue: null,
    value: 'apple',
    ...defaults,
  },
  string: {
    description: 'Description for String test setting',
    name: 'string:test:setting',
    type: 'string',
    userValue: null,
    value: 'hello world',
    ...defaults,
  },
  undefined: {
    description: 'Description for Undefined test setting',
    name: 'undefined:test:setting',
    type: 'undefined',
    userValue: null,
    value: undefined,
    ...defaults,
  },
};

export type StoryProps = Pick<FormProps, 'isSavingEnabled'>;

export const getFormStory = () => {
  const Story = ({ isSavingEnabled }: StoryProps) => {
    const fields: Array<FieldDefinition<SettingType>> = Object.entries(settings).map(
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
