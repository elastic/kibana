/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createTickFormatter } from './tick_formatter';
import { getFieldFormatsRegistry } from '@kbn/data-plugin/public/test_utils';
import { setFieldFormats } from '../../../services';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';

const mockUiSettings = {
  get: (item) => {
    return mockUiSettings[item];
  },
  getUpdate$: () => ({
    subscribe: jest.fn(),
  }),
  [UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS]: true,
  [UI_SETTINGS.QUERY_STRING_OPTIONS]: {},
  [UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX]: true,
  'dateFormat:tz': 'Browser',
  [FORMATS_UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP]: {},
};

const mockCore = {
  chrome: {},
  uiSettings: mockUiSettings,
  http: {
    basePath: {
      get: jest.fn(),
    },
  },
};

describe('createTickFormatter(format, template)', () => {
  setFieldFormats(getFieldFormatsRegistry(mockCore));

  test('returns a number with two decimal place by default', () => {
    const fn = createTickFormatter();
    expect(fn(1.5556)).toEqual('1.56');
  });

  test('returns a percent with percent formatter', () => {
    const config = {
      [FORMATS_UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN]: '0.[00]%',
    };
    const fn = createTickFormatter('percent', null, (key) => config[key]);
    expect(fn(0.5556)).toEqual('55.56%');
  });

  test('returns a byte formatted string with byte formatter', () => {
    const config = {
      [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0.0b',
    };
    const fn = createTickFormatter('bytes', null, (key) => config[key]);
    expect(fn(1500 ^ 10)).toEqual('1.5KB');
  });

  test('returns a custom formatted string with custom formatter', () => {
    const fn = createTickFormatter('0.0a');
    expect(fn(1500)).toEqual('1.5k');
  });

  test('returns a located string with custom locale setting', () => {
    const config = {
      [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE]: 'fr',
    };
    const fn = createTickFormatter('0,0.0', null, (key) => config[key]);
    expect(fn(1500)).toEqual('1 500,0');
  });

  test('returns a custom formatted string with custom formatter and template', () => {
    const fn = createTickFormatter('0.0a', '{{value}}/s');
    expect(fn(1500)).toEqual('1.5k/s');
  });

  test('returns "foo" if passed a string', () => {
    const fn = createTickFormatter();
    expect(fn('foo')).toEqual('foo');
  });

  test('returns value if passed a bad formatter', () => {
    const fn = createTickFormatter('102');
    expect(fn(100)).toEqual('100');
  });

  test('returns formatted value if passed a bad template', () => {
    const config = {
      [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: '0,0.[00]',
    };
    const fn = createTickFormatter('number', '{{value', (key) => config[key]);
    expect(fn(1.5556)).toEqual('1.56');
  });
});
