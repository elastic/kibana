/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiSettingsParams } from '../../../types';
import { getAccessibilitySettings } from './accessibility';
import { getDateFormatSettings } from './date_formats';
import { getMiscUiSettings } from './misc';
import { getNavigationSettings } from './navigation';
import { getNotificationsSettings } from './notifications';
import { getThemeSettings } from './theme';
import { getStateSettings } from './state';

interface GetCoreSettingsOptions {
  isDist?: boolean;
}

export const getCoreSettings = (
  options?: GetCoreSettingsOptions
): Record<string, UiSettingsParams> => {
  return {
    ...getAccessibilitySettings(),
    ...getDateFormatSettings(),
    ...getMiscUiSettings(),
    ...getNavigationSettings(),
    ...getNotificationsSettings(),
    ...getThemeSettings(options),
    ...getStateSettings(),
  };
};
