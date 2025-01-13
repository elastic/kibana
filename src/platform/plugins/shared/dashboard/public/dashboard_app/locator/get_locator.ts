/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { untilPluginStartServicesReady } from '../../services/kibana_services';
import type { DashboardAppLocator } from './locator';

let locatorPromise: Promise<DashboardAppLocator | undefined>;

export function getLocator() {
  if (locatorPromise) return locatorPromise;

  locatorPromise = new Promise(async (resolve) => {
    const [{ createDashboardLocator }] = await Promise.all([
      import('./locator'),
      untilPluginStartServicesReady(),
    ]);

    resolve(createDashboardLocator());
  });
  return locatorPromise;
}

