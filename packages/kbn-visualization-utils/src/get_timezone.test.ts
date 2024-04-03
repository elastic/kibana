/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { IUiSettingsClient } from '@kbn/core/public';
import { getTimeZone } from './get_timezone';

describe('getTimeZone', () => {
  const originalTimezone = moment.tz.guess();

  beforeAll(() => {
    moment.tz.setDefault('America/New_York');
  });

  afterAll(() => {
    if (originalTimezone) {
      moment.tz.setDefault(originalTimezone);
    }
  });

  it('returns local time zone when uiSettings returns Browser', () => {
    expect(
      getTimeZone({
        get: () => 'Browser',
        isDefault: () => true,
      } as unknown as IUiSettingsClient)
    ).toEqual('America/New_York');
  });

  it('returns timezone defined on uiSettings', () => {
    const timezone = 'America/Toronto';
    expect(
      getTimeZone({
        get: () => timezone,
        isDefault: () => false,
      } as unknown as IUiSettingsClient)
    ).toEqual(timezone);
  });
});
