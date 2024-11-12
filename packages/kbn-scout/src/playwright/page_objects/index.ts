/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '../fixtures/types';
import { DatePicker } from './date_picker';
import { DiscoverApp } from './discover_app';
import type { KibanaUrl } from '../../common/services';

export interface PageObjects {
  datePicker: DatePicker;
  discover: DiscoverApp;
}

export function createLazyPageObjects(page: ScoutPage, kbnUrl: KibanaUrl): PageObjects {
  return new Proxy({} as Partial<PageObjects>, {
    get: (target, prop: keyof PageObjects) => {
      if (!(prop in target)) {
        // Lazy-load and cache the instance
        switch (prop) {
          case 'datePicker':
            target[prop] = new DatePicker(page);
            break;
          case 'discover':
            target[prop] = new DiscoverApp(page, kbnUrl);
            break;
          // Add other cases as needed for additional page objects
          default:
            throw new Error(`Unknown page object: ${String(prop)}`);
        }
      }
      return target[prop];
    },
  }) as PageObjects;
}
