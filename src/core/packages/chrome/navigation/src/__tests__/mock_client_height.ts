/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PRIMARY_NAVIGATION_ID } from '../constants';

const PRIMARY_NAVIGATION_HEIGHT = 603;

export const mockClientHeight = (menuItemHeight: number) =>
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.id.includes(PRIMARY_NAVIGATION_ID)
        ? PRIMARY_NAVIGATION_HEIGHT
        : this['data-menu-item'] === 'true'
        ? menuItemHeight
        : 0;
    },
  });
