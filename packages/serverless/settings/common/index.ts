/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as settings from '@kbn/management-settings-ids';

const GENERAL_SETTINGS = [
  settings.CSV_QUOTE_VALUES_ID,
  settings.DATE_FORMAT_DOW_ID,
  settings.DATE_FORMAT_SCALED_ID,
  settings.DATE_FORMAT_TZ_ID,
  settings.DATE_FORMAT_NANOS_ID,
  settings.DEFAULT_INDEX_ID,
  settings.FILTERS_PINNED_BY_DEFAULT_ID,
  settings.FORMAT_BYTES_DEFAULT_PATTERN_ID,
  settings.FORMAT_CURRENCY_DEFAULT_PATTERN_ID,
  settings.FORMAT_NUMBER_DEFAULT_LOCALE_ID,
  settings.FORMAT_NUMBER_DEFAULT_PATTERN_ID,
  settings.FORMAT_PERCENT_DEFAULT_PATTERN_ID,
  settings.META_FIELDS_ID,
  settings.TIMEPICKER_QUICK_RANGES_ID,
  settings.TIMEPICKER_TIME_DEFAULTS_ID,
];

const ACCESSIBILITY_SETTINGS = [settings.ACCESSIBILITY_DISABLE_ANIMATIONS_ID];

const BANNER_SETTINGS = [
  settings.BANNERS_PLACEMENT_ID,
  settings.BANNERS_TEXT_CONTENT_ID,
  settings.BANNERS_TEXT_COLOR_ID,
  settings.BANNERS_BACKGROUND_COLOR_ID,
];

const DISCOVER_SETTINGS = [settings.DEFAULT_COLUMNS_ID];

const NOTIFICATION_SETTINGS = [
  settings.NOTIFICATIONS_BANNER_ID,
  settings.NOTIFICATIONS_LIFETIME_BANNER_ID,
  settings.NOTIFICATIONS_LIFETIME_ERROR_ID,
  settings.NOTIFICATIONS_LIFETIME_INFO_ID,
  settings.NOTIFICATIONS_LIFETIME_WARNING_ID,
];

export const ALL_COMMON_SETTINGS = [
  ...GENERAL_SETTINGS,
  ...ACCESSIBILITY_SETTINGS,
  ...BANNER_SETTINGS,
  ...DISCOVER_SETTINGS,
  ...NOTIFICATION_SETTINGS,
];
