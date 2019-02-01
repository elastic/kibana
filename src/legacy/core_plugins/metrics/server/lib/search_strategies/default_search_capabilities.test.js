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
import DefaultSearchCapabilities from './default_search_capabilities';

describe('DefaultSearchCapabilities', () => {
  let defaultSearchCapabilities;
  let req;
  let batchRequestsSupport;

  beforeEach(() => {
    req = {};
    batchRequestsSupport = true;
    defaultSearchCapabilities = new DefaultSearchCapabilities(req, batchRequestsSupport);
  });

  test('should init default search capabilities', () => {
    expect(defaultSearchCapabilities.request).toBe(req);
    expect(defaultSearchCapabilities.batchRequestsSupport).toBe(batchRequestsSupport);
    expect(defaultSearchCapabilities.fieldsCapabilities).toEqual({});
    expect(defaultSearchCapabilities.validateTimeIntervalRules).toEqual([]);
  });

  test('should return fixedTimeZone', () => {
    expect(defaultSearchCapabilities.fixedTimeZone).toBe(null);
  });

  test('should return defaultTimeInterval', () => {
    expect(defaultSearchCapabilities.defaultTimeInterval).toBe(null);
  });

  test('should return defaultTimeIntervalInSeconds', () => {
    defaultSearchCapabilities.getIntervalInSeconds = jest.fn(() => '20m');

    expect(defaultSearchCapabilities.defaultTimeIntervalInSeconds).toEqual('20m');
    expect(defaultSearchCapabilities.getIntervalInSeconds)
      .toHaveBeenCalledWith(defaultSearchCapabilities.defaultTimeInterval);
  });

  test('should return Search Timezone', () => {
    defaultSearchCapabilities.request = {
      payload: {
        timerange: {
          timezone: 'UTC'
        }
      }
    };

    expect(defaultSearchCapabilities.getSearchTimezone()).toEqual('UTC');
  });

  test('should return interval in seconds', () => {
    expect(defaultSearchCapabilities.getIntervalInSeconds()).toEqual(0);
    expect(defaultSearchCapabilities.getIntervalInSeconds('20m')).toEqual(1200);
    expect(defaultSearchCapabilities.getIntervalInSeconds('1h')).toEqual(3600);
  });

  test('should check if a time interval is valid', () => {
    defaultSearchCapabilities.validateTimeIntervalRules.push(
      () => true
    );

    expect(defaultSearchCapabilities.isTimeIntervalValid()).toBe(true);
    expect(defaultSearchCapabilities.isTimeIntervalValid('20m')).toBe(true);
    expect(defaultSearchCapabilities.isTimeIntervalValid('1h')).toBe(true);

    defaultSearchCapabilities.validateTimeIntervalRules.push(
      () => false
    );

    expect(defaultSearchCapabilities.isTimeIntervalValid('20m')).toBe(false);
  });

  test('should return a valid time interval', () => {
    defaultSearchCapabilities.isTimeIntervalValid = jest.fn(() => true);

    expect(defaultSearchCapabilities.getValidTimeInterval('20m')).toBe('20m');

    defaultSearchCapabilities.isTimeIntervalValid = jest.fn(() => false);

    expect(defaultSearchCapabilities.getValidTimeInterval('20m')).toBe(null);
  });
});
