/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAccessibilitySettings } from './accessibility';
import { getDateFormatSettings } from './date_formats';
import { getMiscUiSettings } from './misc';
import { getNavigationSettings } from './navigation';
import { getNotificationsSettings } from './notifications';
import { getThemeSettings } from './theme';
import { getCoreSettings } from '.';
import { getStateSettings } from './state';

describe('getCoreSettings', () => {
  it('should not have setting overlaps', () => {
    const coreSettingsLength = Object.keys(getCoreSettings()).length;
    const summedLength = [
      getAccessibilitySettings(),
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
