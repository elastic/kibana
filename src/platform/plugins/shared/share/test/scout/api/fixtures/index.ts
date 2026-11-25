/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest as baseApiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

export interface ShortUrlCleanup {
  track(id: string): void;
}

interface ShortUrlTestFixtures {
  shortUrlCleanup: ShortUrlCleanup;
}

export const apiTest = baseApiTest.extend<ShortUrlTestFixtures>({
  shortUrlCleanup: async ({ kbnClient }, use) => {
    const ownedIds = new Set<string>();

    await use({
      track: (id) => ownedIds.add(id),
    });

    if (ownedIds.size === 0) {
      return;
    }

    const { deleted, missing } = await kbnClient.savedObjects.bulkDelete({
      objects: [...ownedIds].map((id) => ({ type: 'url', id })),
    });

    expect(deleted + missing).toBe(ownedIds.size);
  },
});

export * as testData from './constants';
export { createShortUrl, type ShortUrlApiResponse } from './helpers';
