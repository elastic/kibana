/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { createHelpers } from './helpers';

const SPACE_A = 'nav-ro-space-a';
const SPACE_B = 'nav-ro-space-b';

// Space-scoped key whose object shape resembles a sidenav customization payload.
const KEY = 'test:object_key';

const valueA = {
  theme: 'light' as const,
  sidebar: { collapsed: false, width: 250 },
  pinnedItems: ['discover'],
};

const valueB = {
  theme: 'dark' as const,
  sidebar: { collapsed: true, width: 320 },
  pinnedItems: ['dashboards', 'alerts'],
};

// Minimal (read-only) privileges scoped to exactly the two test spaces:
// - A single `read` feature privilege activates a user profile on SAML login
//   (so userStorage is available) without granting any write capability.
// - `applyAutomaticReadPrivilegeGrants` grants every read privilege write access
//   to the `user-storage` / `user-storage-global` saved object types, so this
//   read-only user can still persist its own customizations.
// - The role grants no access to the default space, so every request must be
//   space-prefixed (both spaces below are non-default).
const READ_ONLY_TWO_SPACES: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { discover: ['read'] },
      spaces: [SPACE_A, SPACE_B],
    },
  ],
};

apiTest.describe(
  'User Storage - Read-only user across two spaces',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    const h = createHelpers(() => cookieHeader);

    // Create both spaces before logging in so the custom role's `spaces` exist.
    apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
      await apiServices.spaces.create({ id: SPACE_A, name: SPACE_A });
      await apiServices.spaces.create({ id: SPACE_B, name: SPACE_B });
      ({ cookieHeader } = await samlAuth.asInteractiveUser(READ_ONLY_TWO_SPACES));
    });

    // Space-scoped keys use `multiple-isolated` saved objects whose documents
    // survive `remove()`, so clear any stale state from prior runs before each test.
    apiTest.beforeEach(async ({ apiClient }) => {
      await h.delInSpace(apiClient, SPACE_A, KEY);
      await h.delInSpace(apiClient, SPACE_B, KEY);
    });

    apiTest.afterAll(async ({ apiClient, apiServices }) => {
      await h.delInSpace(apiClient, SPACE_A, KEY);
      await h.delInSpace(apiClient, SPACE_B, KEY);
      await apiServices.spaces.delete(SPACE_A);
      await apiServices.spaces.delete(SPACE_B);
    });

    apiTest(
      'read-only user persists a space-scoped value in two different spaces',
      async ({ apiClient }) => {
        // First space succeeds (it always did).
        const responseA = await h.putInSpace(apiClient, SPACE_A, KEY, valueA);
        expect(responseA).toHaveStatusCode(200);

        // Second space also succeeds. Before the per-space SO id namespacing fix
        // this collided on the shared `multiple-isolated` document id and 500'd.
        const responseB = await h.putInSpace(apiClient, SPACE_B, KEY, valueB);
        expect(responseB).toHaveStatusCode(200);
      }
    );

    apiTest('stored values are isolated per space', async ({ apiClient }) => {
      await h.putInSpace(apiClient, SPACE_A, KEY, valueA);
      await h.putInSpace(apiClient, SPACE_B, KEY, valueB);

      const readA = await h.getKeyInSpace(apiClient, SPACE_A, KEY);
      expect(readA).toHaveStatusCode(200);
      expect(readA.body.value).toStrictEqual(valueA);

      const readB = await h.getKeyInSpace(apiClient, SPACE_B, KEY);
      expect(readB).toHaveStatusCode(200);
      expect(readB.body.value).toStrictEqual(valueB);
    });
  }
);
