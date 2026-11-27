/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import type { KibanaRole, RoleSessionCredentials } from '@kbn/scout';
import { INTERNAL_HEADERS } from '../fixtures';

const NAMESPACE_METADATA_PATH = '/internal/kibana/settings/metadata';
const GLOBAL_METADATA_PATH = '/internal/kibana/global_settings/metadata';

const SAVED_SETTING = 'dateFormat:tz';
const SAVED_VALUE = 'America/Phoenix';
const GLOBAL_SETTING = 'hideAnnouncements';

// Every page injects the runtime settings for this user, so the definitions must not need the
// advancedSettings privilege.
const NO_SETTINGS_PRIVILEGES_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};

const getEntriesWithUserValues = (settings: Record<string, object>) =>
  Object.keys(settings).filter(
    (key) => 'userValue' in settings[key] || 'isOverridden' in settings[key]
  );

apiTest.describe('ui settings metadata', { tag: tags.deploymentAgnostic }, () => {
  const spaceId = `ui_settings_metadata_${Math.random().toString(36).slice(2, 8)}`;
  let cookieHeader: RoleSessionCredentials['cookieHeader'];
  let createdSpace = false;

  apiTest.beforeAll(async ({ samlAuth, kbnClient, config }) => {
    await kbnClient.spaces.create({ id: spaceId, name: spaceId, disabledFeatures: [] });
    createdSpace = true;
    await kbnClient.uiSettings.update({ [SAVED_SETTING]: SAVED_VALUE }, { space: spaceId });

    // Custom roles can't log in on Cloud without a custom SAML provider.
    let role: KibanaRole | string = NO_SETTINGS_PRIVILEGES_ROLE;
    if (config.isCloud && !config.customSamlProviderName) {
      role = 'viewer';
    }
    ({ cookieHeader } = await samlAuth.asInteractiveUser(role));
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    if (createdSpace) {
      await kbnClient.spaces.delete(spaceId);
    }
  });

  apiTest(
    'returns the namespace definitions without saved values to a read-only user',
    async ({ apiClient }) => {
      const response = await apiClient.get(`/s/${spaceId}${NAMESPACE_METADATA_PATH}`, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { settings } = response.body;
      const { name, description, value } = settings[SAVED_SETTING];
      expect({ name: typeof name, description: typeof description }).toStrictEqual({
        name: 'string',
        description: 'string',
      });
      expect(value).not.toBe(SAVED_VALUE);
      expect(getEntriesWithUserValues(settings)).toStrictEqual([]);
    }
  );

  apiTest(
    'returns the global definitions without saved values to a read-only user',
    async ({ apiClient }) => {
      const response = await apiClient.get(GLOBAL_METADATA_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { settings } = response.body;
      const { name, description, scope } = settings[GLOBAL_SETTING];
      expect({ name: typeof name, description: typeof description, scope }).toStrictEqual({
        name: 'string',
        description: 'string',
        scope: 'global',
      });
      expect(settings[SAVED_SETTING]).toBeUndefined();
      expect(getEntriesWithUserValues(settings)).toStrictEqual([]);
    }
  );
});
