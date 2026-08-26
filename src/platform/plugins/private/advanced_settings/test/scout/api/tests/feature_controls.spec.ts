/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ApiClientFixture, RoleSessionCredentials } from '@kbn/scout';
import { apiTest, testData, CUSTOM_ROLES, buildSpacesRole } from '../fixtures';

const {
  COMMON_HEADERS,
  TELEMETRY_HEADERS,
  SETTINGS_API_PATH,
  TELEMETRY_OPTIN_API_PATH,
  ADVANCED_SETTING_KEY,
} = testData;

type CookieHeader = RoleSessionCredentials['cookieHeader'];
type ApiResponse = Awaited<ReturnType<ApiClientFixture['post']>>;

const spacePath = (path: string, spaceId?: string) => (spaceId ? `/s/${spaceId}${path}` : path);

const saveAdvancedSetting = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  spaceId?: string
): Promise<ApiResponse> =>
  apiClient.post(spacePath(SETTINGS_API_PATH, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
    body: { changes: { [ADVANCED_SETTING_KEY]: null } },
  });

const saveTelemetry = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  spaceId?: string
): Promise<ApiResponse> =>
  apiClient.post(spacePath(TELEMETRY_OPTIN_API_PATH, spaceId), {
    headers: { ...TELEMETRY_HEADERS, ...cookieHeader },
    responseType: 'json',
    body: { enabled: true },
  });

// Saving an advanced setting writes the shared `config` saved object, which can return a 409 when
// requests race. Mirror the FTR suite's retry-on-conflict behavior.
const CONFLICT_RETRIES = 3;
const saveWithConflictRetry = async (send: () => Promise<ApiResponse>): Promise<ApiResponse> => {
  let response = await send();
  for (let attempt = 0; attempt < CONFLICT_RETRIES && response.statusCode === 409; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    response = await send();
  }
  return response;
};

// Telemetry opt-in cannot be changed on Cloud (`allowChangingOptInStatus: false`), where the route
// rejects with this exact body before writing anything. On non-Cloud deployments the outcome tracks
// the telemetry saved-object write permission granted by an `all` privilege in the target space.
const TELEMETRY_CLOUD_400_MESSAGE = '{"error":"Not allowed to change Opt-in Status."}';

const assertTelemetryResponse = (
  response: ApiResponse,
  { isCloud, canChange }: { isCloud: boolean; canChange: boolean }
): void => {
  const expected = isCloud
    ? { statusCode: 400, message: TELEMETRY_CLOUD_400_MESSAGE }
    : { statusCode: canChange ? 200 : 403 };

  expect({
    statusCode: response.statusCode,
    ...(isCloud ? { message: response.body?.message } : {}),
  }).toStrictEqual(expected);
};

// A single root-level describe is required (see `@kbn/eslint/scout_max_one_describe`). The spaces
// used by the per-space tests are created once for the suite with unique ids so the suite stays
// isolated on shared Cloud deployments.
apiTest.describe('Advanced settings feature controls', { tag: tags.stateful.classic }, () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const space1Id = `as_fc_space_1_${suffix}`;
  const space2Id = `as_fc_space_2_${suffix}`;
  const space3Id = `as_fc_space_3_${suffix}`;

  // The spaces role descriptor is identical across the three per-space tests, so the fixture
  // reuses the same custom role and cached session cookie instead of recreating them.
  const spacesRole = () => buildSpacesRole(space1Id, space2Id, space3Id);

  apiTest.beforeAll(async ({ kbnClient }) => {
    for (const id of [space1Id, space2Id, space3Id]) {
      await kbnClient.spaces.create({ id, name: id, disabledFeatures: [] });
    }
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await Promise.all([space1Id, space2Id, space3Id].map((id) => kbnClient.spaces.delete(id)));
  });

  apiTest(
    'settings can be saved with the advancedSettings: ["all"] feature privilege',
    async ({ apiClient, samlAuth, config }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(CUSTOM_ROLES.settings_all);

      const settingResponse = await saveWithConflictRetry(() =>
        saveAdvancedSetting(apiClient, cookieHeader)
      );
      expect(settingResponse).toHaveStatusCode(200);
      expect(settingResponse.body.settings).toBeDefined();

      const telemetryResponse = await saveTelemetry(apiClient, cookieHeader);
      assertTelemetryResponse(telemetryResponse, { isCloud: config.isCloud, canChange: true });
    }
  );

  apiTest(
    'settings cannot be saved with the advancedSettings: ["read"] feature privilege',
    async ({ apiClient, samlAuth, config }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(CUSTOM_ROLES.settings_read);

      const settingResponse = await saveWithConflictRetry(() =>
        saveAdvancedSetting(apiClient, cookieHeader)
      );
      expect(settingResponse).toHaveStatusCode(403);

      const telemetryResponse = await saveTelemetry(apiClient, cookieHeader);
      assertTelemetryResponse(telemetryResponse, { isCloud: config.isCloud, canChange: false });
    }
  );

  apiTest(
    'settings cannot be saved with savedObjectsManagement: ["all"] but only advancedSettings: ["read"] privilege',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(
        CUSTOM_ROLES.settings_so_all_settings_read
      );

      const settingResponse = await saveWithConflictRetry(() =>
        saveAdvancedSetting(apiClient, cookieHeader)
      );
      expect(settingResponse).toHaveStatusCode(403);
    }
  );

  apiTest(
    'user_1 can save settings and telemetry in space_1',
    async ({ apiClient, samlAuth, config }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(spacesRole());

      const settingResponse = await saveWithConflictRetry(() =>
        saveAdvancedSetting(apiClient, cookieHeader, space1Id)
      );
      expect(settingResponse).toHaveStatusCode(200);
      expect(settingResponse.body.settings).toBeDefined();

      const telemetryResponse = await saveTelemetry(apiClient, cookieHeader, space1Id);
      assertTelemetryResponse(telemetryResponse, { isCloud: config.isCloud, canChange: true });
    }
  );

  apiTest('user_1 can only save telemetry in space_2', async ({ apiClient, samlAuth, config }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(spacesRole());

    const settingResponse = await saveWithConflictRetry(() =>
      saveAdvancedSetting(apiClient, cookieHeader, space2Id)
    );
    expect(settingResponse).toHaveStatusCode(403);

    const telemetryResponse = await saveTelemetry(apiClient, cookieHeader, space2Id);
    assertTelemetryResponse(telemetryResponse, { isCloud: config.isCloud, canChange: true });
  });

  apiTest(
    "user_1 can't save either settings or telemetry in space_3",
    async ({ apiClient, samlAuth, config }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(spacesRole());

      const settingResponse = await saveWithConflictRetry(() =>
        saveAdvancedSetting(apiClient, cookieHeader, space3Id)
      );
      expect(settingResponse).toHaveStatusCode(403);

      const telemetryResponse = await saveTelemetry(apiClient, cookieHeader, space3Id);
      assertTelemetryResponse(telemetryResponse, { isCloud: config.isCloud, canChange: false });
    }
  );
});
