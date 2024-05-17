/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getCoreSettings } from '.';
import { getAccessibilitySettings } from './accessibility';
import { getAnnouncementsSettings } from './announcements';
import { getDateFormatSettings } from './date_formats';
import { getMiscUiSettings } from './misc';
import { getNavigationSettings } from './navigation';
import { getNotificationsSettings } from './notifications';
import { getStateSettings } from './state';
import { getThemeSettings } from './theme';

describe('getCoreSettings', () => {
  it('should not have setting overlaps', () => {
    const coreSettingsLength = Object.keys(getCoreSettings()).length;
    const summedLength = [
      getAccessibilitySettings(),
      getAnnouncementsSettings(),
      getDateFormatSettings(),
      getMiscUiSettings(),
      getNavigationSettings(),
      getNotificationsSettings(),
      getThemeSettings(),
      getStateSettings(),
    ].reduce((sum, settings) => sum + Object.keys(settings).length, 0);

    expect(coreSettingsLength).toBe(summedLength);
  });
});
