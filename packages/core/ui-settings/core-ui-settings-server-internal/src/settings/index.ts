/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { getAccessibilitySettings } from './accessibility';
import { getDateFormatSettings } from './date_formats';
import { getMiscUiSettings } from './misc';
import { getNotificationsSettings } from './notifications';
import { getThemeSettings } from './theme';
import { getStateSettings } from './state';
import { getAnnouncementsSettings } from './announcements';

interface GetCoreSettingsOptions {
  isDist?: boolean;
}

export const getCoreSettings = (
  options?: GetCoreSettingsOptions
): Record<string, UiSettingsParams> => {
  return {
    ...getAccessibilitySettings(),
    ...getAnnouncementsSettings(),
    ...getDateFormatSettings(),
    ...getMiscUiSettings(),
    ...getNotificationsSettings(),
    ...getThemeSettings(options),
    ...getStateSettings(),
  };
};
