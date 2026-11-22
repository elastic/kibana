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
import type { KbnClient, KibanaRole, RoleSessionCredentials } from '@kbn/scout';
import { INTERNAL_HEADERS } from '../fixtures';

const NAMESPACE_METADATA_PATH = '/internal/kibana/settings/metadata';
const GLOBAL_METADATA_PATH = '/internal/kibana/global_settings/metadata';

const SAVED_SETTING = 'dateFormat:tz';
const SAVED_VALUE = 'America/Phoenix';

// Every page injects the runtime settings for this user, so the definitions must not need the
// advancedSettings privilege.
const NO_SETTINGS_PRIVILEGES_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};

type UiSettingUserValue = Awaited<ReturnType<KbnClient['uiSettings']['get']>>;

const getEntriesWithUserValues = (settings: Record<string, object>) =>
  Object.keys(settings).filter(
    (key) => 'userValue' in settings[key] || 'isOverridden' in settings[key]
  );

apiTest.describe('ui settings metadata', { tag: tags.deploymentAgnostic }, () => {
  let cookieHeader: RoleSessionCredentials['cookieHeader'];
  let originalValue: UiSettingUserValue;
  let capturedOriginalValue = false;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    originalValue = await kbnClient.uiSettings.get(SAVED_SETTING);
    capturedOriginalValue = true;
    await kbnClient.uiSettings.update({ [SAVED_SETTING]: SAVED_VALUE });
    ({ cookieHeader } = await samlAuth.asInteractiveUser(NO_SETTINGS_PRIVILEGES_ROLE));
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    if (!capturedOriginalValue) {
      return;
    }
    if (originalValue === undefined) {
      await kbnClient.uiSettings.unset(SAVED_SETTING);
      return;
    }
    await kbnClient.uiSettings.update({ [SAVED_SETTING]: originalValue });
  });

  apiTest(
    'returns the namespace definitions without saved values to a user without settings privileges',
    async ({ apiClient }) => {
      const response = await apiClient.get(NAMESPACE_METADATA_PATH, {
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
    'returns the global definitions without saved values to a user without settings privileges',
    async ({ apiClient }) => {
      const response = await apiClient.get(GLOBAL_METADATA_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(getEntriesWithUserValues(response.body.settings)).toStrictEqual([]);
    }
  );

  apiTest('rejects unauthenticated requests', async ({ apiClient }) => {
    for (const path of [NAMESPACE_METADATA_PATH, GLOBAL_METADATA_PATH]) {
      const response = await apiClient.get(path, {
        headers: INTERNAL_HEADERS,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(401);
    }
  });
});
