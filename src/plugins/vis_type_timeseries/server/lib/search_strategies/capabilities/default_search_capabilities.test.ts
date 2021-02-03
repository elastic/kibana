/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DefaultSearchCapabilities } from './default_search_capabilities';
import type { ReqFacade } from '../strategies/abstract_search_strategy';
import type { VisPayload } from '../../../../common/types';

describe('DefaultSearchCapabilities', () => {
  let defaultSearchCapabilities: DefaultSearchCapabilities;
  let req: ReqFacade<VisPayload>;

  beforeEach(() => {
    req = {} as ReqFacade<VisPayload>;
    defaultSearchCapabilities = new DefaultSearchCapabilities(req);
  });

  test('should init default search capabilities', () => {
    expect(defaultSearchCapabilities.request).toBe(req);
    expect(defaultSearchCapabilities.fieldsCapabilities).toEqual({});
  });

  test('should return defaultTimeInterval', () => {
    expect(defaultSearchCapabilities.defaultTimeInterval).toBe(null);
  });

  test('should return default uiRestrictions', () => {
    expect(defaultSearchCapabilities.uiRestrictions).toEqual({
      whiteListedMetrics: { '*': true },
      whiteListedGroupByFields: { '*': true },
      whiteListedTimerangeModes: { '*': true },
    });
  });

  test('should return Search Timezone', () => {
    defaultSearchCapabilities.request = ({
      payload: {
        timerange: {
          timezone: 'UTC',
        },
      },
    } as unknown) as ReqFacade<VisPayload>;

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
