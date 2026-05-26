/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Capabilities contract for the Kibana Home page. Each role drives whether
// the Stack Management quick-link and Manage section render, via the
// `navLinks.management` capability. Migrated from the deleted FTR feature-controls
// suite at x-pack/platform/test/functional/apps/home/feature_controls.
//
// We use samlAuth.asInteractiveUser + cookieHeader (not API key) because
// the home page reads capabilities from the interactive session; an API-key
// based call can resolve to a different shape (see scout-migrate-from-ftr
// "Scout API auth" guidance).

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, CUSTOM_ROLES, INTERNAL_HEADERS } from '../fixtures';

apiTest.describe(
  'POST /api/core/capabilities — Home page navLinks',
  { tag: tags.stateful.classic },
  () => {
    apiTest('global:all resolves navLinks.management to true', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(CUSTOM_ROLES.global_all);

      const response = await apiClient.post('/api/core/capabilities', {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { applications: ['kibana'] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.navLinks.management).toBe(true);
    });

    apiTest(
      'dashboard:all resolves navLinks.management to false',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          CUSTOM_ROLES.global_dashboard_all
        );

        const response = await apiClient.post('/api/core/capabilities', {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { applications: ['kibana'] },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.navLinks.management).toBe(false);
      }
    );
  }
);
