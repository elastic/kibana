/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import FormData from 'form-data';
import { REPO_ROOT } from '@kbn/repo-info';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { COMMON_HEADERS, MANAGEMENT_API, NDJSON_EXPORTS, NDJSON_EXPECTED_COUNTS } = testData;

const ANOTHER_SPACE_ID = 'another_space';

const readNdjson = (relativePath: string): Buffer =>
  Fs.readFileSync(Path.resolve(REPO_ROOT, relativePath));

// Uploads the .ndjson verbatim so the request matches what the SOM UI posts.
const importNdjsonRequest = (
  fileBytes: Buffer,
  fileName: string
): { headers: Record<string, string>; body: Buffer } => {
  const form = new FormData();
  form.append('file', fileBytes, fileName);
  return { headers: form.getHeaders(), body: form.getBuffer() };
};

const importPath = (spaceId?: string) =>
  spaceId && spaceId !== 'default'
    ? `/s/${spaceId}${MANAGEMENT_API.IMPORT}?overwrite=true`
    : `${MANAGEMENT_API.IMPORT}?overwrite=true`;

apiTest.describe('Saved Objects Management - imports', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    await kbnClient.spaces.create({
      id: ANOTHER_SPACE_ID,
      name: ANOTHER_SPACE_ID,
      disabledFeatures: [],
    });
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.spaces.delete(ANOTHER_SPACE_ID);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('imports 7.13 saved objects ndjson into the default space', async ({ apiClient }) => {
    const { headers, body } = importNdjsonRequest(
      readNdjson(NDJSON_EXPORTS.V_7_13_SAVED_OBJECTS),
      'import.ndjson'
    );

    const response = await apiClient.post(importPath(), {
      headers: { ...adminCredentials.apiKeyHeader, ...COMMON_HEADERS, ...headers },
      body,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({
      success: true,
      successCount: NDJSON_EXPECTED_COUNTS.V_7_13_SAVED_OBJECTS,
    });
  });

  apiTest('imports 7.14 alerts/actions ndjson into the default space', async ({ apiClient }) => {
    const { headers, body } = importNdjsonRequest(
      readNdjson(NDJSON_EXPORTS.V_7_14_ALERTS_ACTIONS),
      'import.ndjson'
    );

    const response = await apiClient.post(importPath(), {
      headers: { ...adminCredentials.apiKeyHeader, ...COMMON_HEADERS, ...headers },
      body,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({
      success: true,
      successCount: NDJSON_EXPECTED_COUNTS.V_7_14_ALERTS_ACTIONS,
    });
  });

  apiTest('imports the 8.0 multispace ndjson into the default space', async ({ apiClient }) => {
    const { headers, body } = importNdjsonRequest(
      readNdjson(NDJSON_EXPORTS.V_8_0_MULTISPACE),
      'import.ndjson'
    );

    const response = await apiClient.post(importPath(), {
      headers: { ...adminCredentials.apiKeyHeader, ...COMMON_HEADERS, ...headers },
      body,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({
      success: true,
      successCount: NDJSON_EXPECTED_COUNTS.V_8_0_MULTISPACE,
    });
  });

  apiTest('imports the 8.0 multispace ndjson into a non-default space', async ({ apiClient }) => {
    const { headers, body } = importNdjsonRequest(
      readNdjson(NDJSON_EXPORTS.V_8_0_MULTISPACE),
      'import.ndjson'
    );

    const response = await apiClient.post(importPath(ANOTHER_SPACE_ID), {
      headers: { ...adminCredentials.apiKeyHeader, ...COMMON_HEADERS, ...headers },
      body,
    });

    expect(response).toHaveStatusCode(200);
    // Same successCount as the default-space import — the IDs do not collide
    // because spaces live in separate namespaces.
    expect(response.body).toMatchObject({
      success: true,
      successCount: NDJSON_EXPECTED_COUNTS.V_8_0_MULTISPACE,
    });
  });
});
