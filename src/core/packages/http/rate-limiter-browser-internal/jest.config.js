/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<<< HEAD:src/core/packages/chrome/navigation/src/utils/get_has_submenu.ts
import { MenuItem } from '../../types';

/**
 * Utility function for checking whether the menu item has a submenu
 */
export const getHasSubmenu = (item: MenuItem): boolean => {
  return !!item.sections && item.sections.length > 0;
========
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/src/core/packages/http/rate-limiter-browser-internal'],
>>>>>>>> 839cb471382ba41c40b8f66a6177648bef635ad1:src/core/packages/http/rate-limiter-browser-internal/jest.config.js
};
