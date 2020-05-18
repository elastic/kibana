/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createTickFormatter } from './tick_formatter';
import { getFieldFormatsRegistry } from '../../../../../../test_utils/public/stub_field_formats';
import { setFieldFormats } from '../../../services';
import {
  QUERY_STRING_OPTIONS_SETTINGS,
  QUERY_ALLOW_LEADING_WILDCARDS_SETTINGS,
  COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX_SETTINGS,
  FORMAT_DEFAULT_TYPE_MAP_SETTINGS,
  FORMAT_NUMBER_DEFAULT_PATTERN_SETTINGS,
  FORMAT_PERCENT_DEFAULT_PATTERN_SETTINGS,
  FORMAT_BYTES_DEFAULT_PATTERN_SETTINGS,
  FORMAT_NUMBER_DEFAULT_LOCALE_SETTINGS,
} from '../../../../../data/common';

const mockUiSettings = {
  get: item => {
    return mockUiSettings[item];
  },
  getUpdate$: () => ({
    subscribe: jest.fn(),
  }),
  [QUERY_ALLOW_LEADING_WILDCARDS_SETTINGS]: true,
  [QUERY_STRING_OPTIONS_SETTINGS]: {},
  [COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX_SETTINGS]: true,
  'dateFormat:tz': 'Browser',
  [FORMAT_DEFAULT_TYPE_MAP_SETTINGS]: {},
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
      [FORMAT_PERCENT_DEFAULT_PATTERN_SETTINGS]: '0.[00]%',
    };
    const fn = createTickFormatter('percent', null, key => config[key]);
    expect(fn(0.5556)).toEqual('55.56%');
  });

  test('returns a byte formatted string with byte formatter', () => {
    const config = {
      [FORMAT_BYTES_DEFAULT_PATTERN_SETTINGS]: '0.0b',
    };
    const fn = createTickFormatter('bytes', null, key => config[key]);
    expect(fn(1500 ^ 10)).toEqual('1.5KB');
  });

  test('returns a custom formatted string with custom formatter', () => {
    const fn = createTickFormatter('0.0a');
    expect(fn(1500)).toEqual('1.5k');
  });

  test('returns a located string with custom locale setting', () => {
    const config = {
      [FORMAT_NUMBER_DEFAULT_LOCALE_SETTINGS]: 'fr',
    };
    const fn = createTickFormatter('0,0.0', null, key => config[key]);
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
      [FORMAT_NUMBER_DEFAULT_PATTERN_SETTINGS]: '0,0.[00]',
    };
    const fn = createTickFormatter('number', '{{value', key => config[key]);
    expect(fn(1.5556)).toEqual('1.56');
  });
});
