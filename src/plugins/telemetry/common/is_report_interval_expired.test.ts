/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPORT_INTERVAL_MS } from './constants';
import { isReportIntervalExpired } from './is_report_interval_expired';

describe('isReportIntervalExpired', () => {
  test('true when undefined', () => {
    expect(isReportIntervalExpired(undefined)).toBe(true);
    expect(isReportIntervalExpired(void 0)).toBe(true);
  });

  describe('true when NaN', () => {
    test('NaN', () => {
      expect(isReportIntervalExpired(NaN)).toBe(true);
    });

    test('parseInt(undefined)', () => {
      expect(isReportIntervalExpired(parseInt(undefined as unknown as string, 10))).toBe(true);
    });

    test('parseInt(null)', () => {
      expect(isReportIntervalExpired(parseInt(null as unknown as string, 10))).toBe(true);
    });

    test('parseInt("")', () => {
      expect(isReportIntervalExpired(parseInt('', 10))).toBe(true);
    });

    test('empty string', () => {
      expect(isReportIntervalExpired('' as unknown as number)).toBe(true);
    });

    test('malformed string', () => {
      expect(isReportIntervalExpired(`random_malformed_string` as unknown as number)).toBe(true);
    });

    test('other object', () => {
      expect(isReportIntervalExpired({} as unknown as number)).toBe(true);
    });
  });

  test('true when 0', () => {
    expect(isReportIntervalExpired(0)).toBe(true);
  });

  test('true when actually expired', () => {
    expect(isReportIntervalExpired(Date.now() - REPORT_INTERVAL_MS - 1000)).toBe(true);
  });

  test('false when close but not yet', () => {
    expect(isReportIntervalExpired(Date.now() - REPORT_INTERVAL_MS + 1000)).toBe(false);
  });

  test('false when date in the future', () => {
    expect(isReportIntervalExpired(Date.now() + 1000)).toBe(false);
  });

  test('false when date is now', () => {
    expect(isReportIntervalExpired(Date.now())).toBe(false);
  });
});
