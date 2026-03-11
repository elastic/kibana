/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { DEFAULT_IGNORE_PARENT_SETTINGS } from '@kbn/controls-plugin/common';
import {
  apiTest,
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  KBN_ARCHIVES,
  TEST_DASHBOARD_ID,
} from '../fixtures';

apiTest.describe('dashboards - create', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    // returns editor role in most deployment project and deployment types
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
    await kbnClient.importExport.load(KBN_ARCHIVES.TAGS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('sets top level default values', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        attributes: {
          title,
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.item.attributes.kibanaSavedObjectMeta.searchSource).toStrictEqual({});
    expect(response.body.item.attributes.panels).toStrictEqual([]);
    expect(response.body.item.attributes.timeRestore).toBe(false);
    expect(response.body.item.attributes.options).toStrictEqual({
      hidePanelTitles: false,
      useMargins: true,
      syncColors: true,
      syncTooltips: true,
      syncCursor: true,
    });
  });

  apiTest('sets panels default values', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        attributes: {
          title,
          panels: [
            {
              type: 'visualization',
              gridData: {
                x: 0,
                y: 0,
                w: 24,
                h: 15,
              },
              panelConfig: {},
            },
          ],
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body.item.attributes.panels)).toBe(true);
    // panel index is a random uuid when not provided
    expect(/^[0-9a-f-]{36}$/.test(response.body.item.attributes.panels[0].panelIndex)).toBe(true);
    expect(response.body.item.attributes.panels[0].panelIndex).toBe(
      response.body.item.attributes.panels[0].gridData.i
    );
  });

  apiTest('sets controls default values', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        attributes: {
          title,
          controlGroupInput: {
            controls: [
              {
                type: 'optionsListControl',
                order: 0,
                width: 'medium',
                grow: true,
                controlConfig: {
                  title: 'Origin City',
                  fieldName: 'OriginCityName',
                  dataViewId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                  selectedOptions: [],
                  enhancements: {},
                },
              },
            ],
          },
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    // generates a random saved object id
    expect(/^[0-9a-f-]{36}$/.test(response.body.item.id)).toBe(true);
    // saved object stores controls panels as an object, but the API should return as an array
    expect(Array.isArray(response.body.item.attributes.controlGroupInput.controls)).toBe(true);
    expect(response.body.item.attributes.controlGroupInput.ignoreParentSettings).toStrictEqual(
      DEFAULT_IGNORE_PARENT_SETTINGS
    );
  });

  apiTest('can create a dashboard with a specific id', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;
    const id = `bar-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(`${DASHBOARD_API_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        attributes: { title },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.item.id).toBe(id);
  });

  apiTest('creates a dashboard with references', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        attributes: {
          title,
          panels: [
            {
              type: 'visualization',
              gridData: {
                x: 0,
                y: 0,
                w: 24,
                h: 15,
                i: 'bizz',
              },
              panelConfig: {},
              panelIndex: 'bizz',
              panelRefName: 'panel_bizz',
            },
          ],
        },
        references: [
          {
            name: 'bizz:panel_bizz',
            type: 'visualization',
            id: 'my-saved-object',
          },
        ],
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body.item.attributes.panels)).toBe(true);
  });

  // TODO Maybe move this test to x-pack/platform/test/api_integration/dashboards
  apiTest('can create a dashboard in a defined space', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;
    const spaceId = 'space-1';

    const response = await apiClient.post(`s/${spaceId}/${DASHBOARD_API_PATH}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        attributes: {
          title,
        },
        spaces: [spaceId],
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.item.namespaces).toStrictEqual([spaceId]);
  });

  apiTest('return error if provided id already exists', async ({ apiClient }) => {
    const title = `foo-${Date.now()}-${Math.random()}`;

    const response = await apiClient.post(`${DASHBOARD_API_PATH}/${TEST_DASHBOARD_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        attributes: {
          title,
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(409);
    expect(response.body.message).toBe(
      `A dashboard with saved object ID ${TEST_DASHBOARD_ID} already exists.`
    );
  });

  apiTest('validation - returns error when title is not provided', async ({ apiClient }) => {
    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {},
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.attributes.title]: expected value of type [string] but got [undefined]'
    );
  });

  apiTest('validation - returns error if panels is not an array', async ({ apiClient }) => {
    const response = await apiClient.post(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        attributes: {
          title: 'foo',
          panels: {},
        },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body.attributes.panels]: expected value of type [array] but got [Object]'
    );
  });
});
