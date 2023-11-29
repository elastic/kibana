/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isSyntheticsMonitor } from './is_synthetics_monitor';

describe('isSyntheticsMonitor', () => {
  test('returns false for any user agent', () => {
    expect(isSyntheticsMonitor()).toBe(false);
  });

  test('returns true for when the user agent contains "Elastic/Synthetics"', () => {
    jest
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue(window.navigator.userAgent + 'Elastic/Synthetics');
    expect(isSyntheticsMonitor()).toBe(true);
  });
});
