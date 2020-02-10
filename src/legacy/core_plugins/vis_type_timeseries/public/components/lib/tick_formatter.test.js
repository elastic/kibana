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
import { setFieldFormats } from '../../services';

const mockUiSettings = {
  get: item => {
    return mockUiSettings[item];
  },
  getUpdate$: () => ({
    subscribe: jest.fn(),
  }),
  'query:allowLeadingWildcards': true,
  'query:queryString:options': {},
  'courier:ignoreFilterIfFieldNotInIndex': true,
  'dateFormat:tz': 'Browser',
  'format:defaultTypeMap': {},
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
      'format:percent:defaultPattern': '0.[00]%',
    };
    const fn = createTickFormatter('percent', null, key => config[key]);
    expect(fn(0.5556)).toEqual('55.56%');
  });

  test('returns a byte formatted string with byte formatter', () => {
    const config = {
      'format:bytes:defaultPattern': '0.0b',
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
      'format:number:defaultLocale': 'fr',
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
      'format:number:defaultPattern': '0,0.[00]',
    };
    const fn = createTickFormatter('number', '{{value', key => config[key]);
    expect(fn(1.5556)).toEqual('1.56');
  });
});
