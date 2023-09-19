/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { KnownTypeToMetadata } from '@kbn/management-settings-types/metadata';

import { Form } from './form';
import { wrap } from './mocks';

const defaults = {
  requiresPageReload: false,
  readonly: false,
  category: ['category'],
};

const defaultValues: Record<SettingType, any> = {
  array: ['example_value'],
  boolean: true,
  color: '#FF00CC',
  image: '',
  json: "{ foo: 'bar2' }",
  markdown: 'Hello World',
  number: 1,
  select: 'apple',
  string: 'hello world',
  undefined: 'undefined',
};

type Settings = {
  [key in SettingType]: KnownTypeToMetadata<key>;
};

const settings: Omit<Settings, 'markdown' | 'json'> = {
  array: {
    description: 'Description for Array test setting',
    name: 'array:test:setting',
    type: 'array',
    userValue: null,
    value: defaultValues.array,
    ...defaults,
  },
  boolean: {
    description: 'Description for Boolean test setting',
    name: 'boolean:test:setting',
    type: 'boolean',
    userValue: null,
    value: defaultValues.boolean,
    ...defaults,
  },
  color: {
    description: 'Description for Color test setting',
    name: 'color:test:setting',
    type: 'color',
    userValue: null,
    value: defaultValues.color,
    ...defaults,
  },
  image: {
    description: 'Description for Image test setting',
    name: 'image:test:setting',
    type: 'image',
    userValue: null,
    value: defaultValues.image,
    ...defaults,
  },
  number: {
    description: 'Description for Number test setting',
    name: 'number:test:setting',
    type: 'number',
    userValue: null,
    value: defaultValues.number,
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
    value: defaultValues.select,
    ...defaults,
  },
  string: {
    description: 'Description for String test setting',
    name: 'string:test:setting',
    type: 'string',
    userValue: null,
    value: defaultValues.string,
    ...defaults,
  },
  undefined: {
    description: 'Description for Undefined test setting',
    name: 'undefined:test:setting',
    type: 'undefined',
    userValue: null,
    value: defaultValues.undefined,
    ...defaults,
  },
};

const fields: Array<FieldDefinition<SettingType>> = Object.entries(settings).map(([id, setting]) =>
  getFieldDefinition({
    id,
    setting,
    params: { isCustom: false, isOverridden: setting.isOverridden },
  })
);

describe('Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    const { container } = render(wrap(<Form fields={fields} isSavingEnabled={true} />));

    expect(container).toBeInTheDocument();
  });

  // TODO: Add more test cases
});
