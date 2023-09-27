/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KnownTypeToMetadata, SettingType } from '@kbn/management-settings-types';

const defaults = {
  requiresPageReload: false,
  readonly: false,
};

type Settings = {
  [key in SettingType]: KnownTypeToMetadata<key>;
};

/**
 * A utility function returning a representative set of UiSettings.
 * @param requirePageReload The value of the `requirePageReload` param for all settings.
 */
export const getSettingsMock = (requirePageReload: boolean = false): Settings => {
  if (requirePageReload) {
    defaults.requiresPageReload = true;
  }
  return {
    array: {
      description: 'Description for Array test setting',
      name: 'array:test:setting',
      type: 'array',
      userValue: null,
      value: ['foo', 'bar', 'baz'],
      category: ['general', 'dashboard'],
      ...defaults,
    },
    boolean: {
      description: 'Description for Boolean test setting',
      name: 'boolean:test:setting',
      type: 'boolean',
      userValue: null,
      value: true,
      category: ['general', 'dashboard'],
      ...defaults,
    },
    color: {
      description: 'Description for Color test setting',
      name: 'color:test:setting',
      type: 'color',
      userValue: null,
      value: '#FF00CC',
      category: ['general', 'dashboard'],
      ...defaults,
    },
    image: {
      description: 'Description for Image test setting',
      name: 'image:test:setting',
      type: 'image',
      userValue: null,
      value: '',
      category: ['dashboard', 'discover'],
      ...defaults,
    },
    number: {
      description: 'Description for Number test setting',
      name: 'number:test:setting',
      type: 'number',
      userValue: null,
      value: 1,
      category: ['dashboard', 'discover'],
      ...defaults,
    },
    json: {
      name: 'json:test:setting',
      description: 'Description for Json test setting',
      type: 'json',
      userValue: null,
      value: '{"foo": "bar"}',
      category: ['dashboard', 'discover'],
      ...defaults,
    },
    markdown: {
      name: 'markdown:test:setting',
      description: 'Description for Markdown test setting',
      type: 'markdown',
      userValue: null,
      value: '',
      category: ['notifications', 'search'],
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
      category: ['notifications', 'search'],
      ...defaults,
    },
    string: {
      description: 'Description for String test setting',
      name: 'string:test:setting',
      type: 'string',
      userValue: null,
      value: 'hello world',
      category: ['notifications', 'search'],
      ...defaults,
    },
    undefined: {
      description: 'Description for Undefined test setting',
      name: 'undefined:test:setting',
      type: 'undefined',
      userValue: null,
      value: undefined,
      category: ['notifications', 'search'],
      ...defaults,
    },
  };
};
