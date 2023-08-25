/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const GENERAL_SETTINGS = [
  'csv:quoteValues',
  'dateFormat:dow',
  'dateFormat:scaled',
  'dateFormat:tz',
  'dateNanosFormat',
  'defaultIndex',
  'filters:pinnedByDefault',
  'format:bytes:defaultPattern',
  'format:currency:defaultPattern',
  'format:number:defaultLocale',
  'format:number:defaultPattern',
  'format:percent:defaultPattern',
  'metaFields',
  'state:storeInSessionStorage',
  'timepicker:quickRanges',
  'timepicker:timeDefaults',
];

const PRESENTATION_LABS_SETTINGS = ['labs:dashboard:deferBelowFold'];

const ACCESSIBILITY_SETTINGS = ['accessibility:disableAnimations'];

const AUTOCOMPLETE_SETTINGS = ['autocomplete:valueSuggestionMethod'];

const BANNER_SETTINGS = [
  'banners:placement',
  'banners:textContent',
  'banners:textColor',
  'banners:backgroundColor',
];

const DISCOVER_SETTINGS = ['defaultColumns'];

const NOTIFICATION_SETTINGS = [
  'notifications:banner',
  'notifications:lifetime:banner',
  'notifications:lifetime:error',
  'notifications:lifetime:info',
  'notifications:lifetime:warning',
];

export const ALL_COMMON_SETTINGS = [
  ...GENERAL_SETTINGS,
  ...PRESENTATION_LABS_SETTINGS,
  ...ACCESSIBILITY_SETTINGS,
  ...AUTOCOMPLETE_SETTINGS,
  ...BANNER_SETTINGS,
  ...DISCOVER_SETTINGS,
  ...NOTIFICATION_SETTINGS,
];
