/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SettingType } from '@kbn/management-settings-types';

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu odio velit. Integer et mauris quis ligula elementum commodo. Morbi eu ipsum diam. Nulla auctor orci eget egestas vehicula. Aliquam gravida, dolor eu posuere vulputate, neque enim viverra odio, id viverra ipsum quam et ipsum.';

const JSON_DEFAULT = `{
  "foo": "bar"
}`;

const JSON_USER = `{
  "foo": "baz",
  "bar": "qux"
}`;

const MARKDOWN = `# Heading 1

${LOREM.split('. ')
  .map((sentence) => `- ${sentence}.`)
  .join('\n')}
`;

/**
 * A predefined Image as a Base64 string.
 */
export const IMAGE = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC
`;

/**
 * Given a {@link SettingType}, returns a compatible user-defined value.
 */
export const getUserValue = (type: SettingType) => {
  switch (type) {
    case 'array':
      return ['foo', 'bar'];
    case 'boolean':
      return true;
    case 'color':
      return '#654321';
    case 'image':
      return IMAGE;
    case 'json':
      return JSON_USER;
    case 'markdown':
      return MARKDOWN;
    case 'number':
      return 54321;
    case 'select':
      return 'option2';
    case 'string':
    default:
      return 'some user value';
  }
};

/**
 * Given a {@link SettingType}, returns a compatible default value.
 */
export const getDefaultValue = (type: SettingType) => {
  switch (type) {
    case 'array':
      return ['foo', 'bar', 'baz'];
    case 'boolean':
      return false;
    case 'color':
      return '#123456';
    case 'image':
      return '';
    case 'json':
      return JSON_DEFAULT;
    case 'markdown':
      return '';
    case 'number':
      return 12345;
    case 'select':
      return 'option1';
    case 'string':
    default:
      return 'some default';
  }
};
