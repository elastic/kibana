/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Stack Management sidebar — ingest, security, and stack section visibility driven by ES cluster privileges.

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { CUSTOM_ROLES, test } from '../fixtures';

test.describe('Stack Management — ingest, security, and stack sections', () => {
  test(
    'logstash_read_user sees only the ingest section with pipelines',
    { tag: tags.stateful.classic },
    async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.dashboard_read_and_logstash);

      await test.step('navigate to management and assert nav link + sidebar', async () => {
        await pageObjects.management.goto();
        const navLinks = await pageObjects.collapsibleNav.getNavLinks();
        expect(navLinks).toContain('Stack Management');

        const sections = await pageObjects.management.readSidebarSections();
        // kibana section with 'settings' appears because advancedSettings:read is granted
        expect(sections).toHaveLength(2);
        expect(sections[0]).toStrictEqual({
          sectionId: 'ingest',
          sectionLinks: ['pipelines'],
        });
        expect(sections[1]).toStrictEqual({
          sectionId: 'kibana',
          sectionLinks: ['settings'],
        });
      });
    }
  );

  // Pre-migration tag 'skipFIPS'
  test(
    'manage_security sees only the security section with all five links',
    { tag: tags.stateful.classic },
    async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.dashboard_read_and_manage_security);

      await test.step('navigate to management and assert nav link + sidebar', async () => {
        await pageObjects.management.goto();
        const navLinks = await pageObjects.collapsibleNav.getNavLinks();
        expect(navLinks).toContain('Stack Management');

        const sections = await pageObjects.management.readSidebarSections();
        // kibana section with 'settings' appears because advancedSettings:read is granted
        expect(sections).toHaveLength(2);
        expect(sections[0]).toStrictEqual({
          sectionId: 'security',
          sectionLinks: ['users', 'roles', 'api_keys', 'service_accounts', 'role_mappings'],
        });
        expect(sections[1]).toStrictEqual({
          sectionId: 'kibana',
          sectionLinks: ['settings'],
        });
      });
    }
  );

  test(
    'cluster:manage surfaces ingest, data (incl. remote_clusters) and stack (license_management) sections',
    { tag: '@local-stateful-classic' },
    async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.dashboard_read_and_license_management);

      await test.step('navigate to management and assert nav link + sidebar', async () => {
        await pageObjects.management.goto();
        const navLinks = await pageObjects.collapsibleNav.getNavLinks();
        expect(navLinks).toContain('Stack Management');

        // cluster:manage surfaces ingest (ingest_pipelines + logstash pipelines), data (incl. remote_clusters),
        // kibana (settings, from advancedSettings:read) and stack (license_management).
        // Polled because data_federation is enabled asynchronously once the license is fetched.
        await expect
          .poll(() => pageObjects.management.readSidebarSections())
          .toStrictEqual([
            { sectionId: 'ingest', sectionLinks: ['ingest_pipelines', 'pipelines'] },
            {
              sectionId: 'data',
              sectionLinks: [
                'index_management',
                'data_federation',
                'index_lifecycle_management',
                'snapshot_restore',
                'rollup_jobs',
                'transform',
                'remote_clusters',
              ],
            },
            { sectionId: 'kibana', sectionLinks: ['settings'] },
            { sectionId: 'stack', sectionLinks: ['license_management'] },
          ]);
      });
    }
  );
});
