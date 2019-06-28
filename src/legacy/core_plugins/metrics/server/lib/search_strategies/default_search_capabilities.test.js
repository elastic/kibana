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
import { DefaultSearchCapabilities } from './default_search_capabilities';

describe('DefaultSearchCapabilities', () => {
  let defaultSearchCapabilities;
  let req;

  beforeEach(() => {
    req = {};
    defaultSearchCapabilities = new DefaultSearchCapabilities(req);
  });

  test('should init default search capabilities', () => {
    expect(defaultSearchCapabilities.request).toBe(req);
    expect(defaultSearchCapabilities.fieldsCapabilities).toEqual({});
  });

  test('should return defaultTimeInterval', () => {
    expect(defaultSearchCapabilities.defaultTimeInterval).toBe(null);
  });

  test('should return Search Timezone', () => {
    defaultSearchCapabilities.request = {
      payload: {
        timerange: {
          timezone: 'UTC',
        },
      },
    };

    expect(defaultSearchCapabilities.searchTimezone).toEqual('UTC');
  });

  test('should return a valid time interval', () => {
    expect(defaultSearchCapabilities.getValidTimeInterval('20m')).toBe('20m');
  });

  test('should parse interval', () => {
    expect(defaultSearchCapabilities.parseInterval('120s')).toEqual({
      value: 120,
      unit: 's',
    });

    expect(defaultSearchCapabilities.parseInterval('20m')).toEqual({
      value: 20,
      unit: 'm',
    });

    expect(defaultSearchCapabilities.parseInterval('1y')).toEqual({
      value: 1,
      unit: 'y',
    });
  });

  test('should convert interval string into different unit', () => {
    expect(defaultSearchCapabilities.convertIntervalToUnit('120s', 's')).toEqual({
      value: 120,
      unit: 's',
    });

    expect(defaultSearchCapabilities.convertIntervalToUnit('60m', 'h')).toEqual({
      value: 1,
      unit: 'h',
    });

    expect(defaultSearchCapabilities.convertIntervalToUnit('4w', 'M')).toEqual({
      value: 1,
      unit: 'M',
    });

    expect(defaultSearchCapabilities.convertIntervalToUnit('1y', 'w')).toEqual({
      value: 48,
      unit: 'w',
    });

    expect(defaultSearchCapabilities.convertIntervalToUnit('60s', 'm')).toEqual({
      value: 1,
      unit: 'm',
    });

    expect(defaultSearchCapabilities.convertIntervalToUnit('1s', 'ms')).toEqual({
      value: 1000,
      unit: 'ms',
    });
  });
});
