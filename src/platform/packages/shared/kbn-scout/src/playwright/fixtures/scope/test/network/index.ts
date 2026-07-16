/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreWorkerFixtures } from '../../worker';
import type { ScoutPage } from '../scout_page';
import { Network } from './network';

export const networkFixture = coreWorkerFixtures.extend<{ network: Network; page: ScoutPage }>({
  network: [
    async ({ page, log }, use) => {
      log.serviceLoaded('network');

      await use(new Network(page));
    },
    { scope: 'test' },
  ],
});

export type NetworkFixture = Network;
