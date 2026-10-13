/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `data-test-subj` values owned by the chrome header, shared between the
 * components and test consumers to prevent drift.
 */
export const CHROME_HEADER_TEST_SUBJECTS = {
  root: 'kbnChromeHeader',
  search: 'kbnChromeHeader-search',
  searchButton: 'kbnChromeHeader-searchButton',
  help: 'kbnChromeHeader-help',
  helpButton: 'kbnChromeHeader-helpButton',
  actions: 'kbnChromeHeader-actions',
  userMenu: 'kbnChromeHeader-userMenu',
  switcher: 'kbnChromeHeader-switcher',
  projectPicker: 'kbnChromeHeader-projectPicker',
} as const;
