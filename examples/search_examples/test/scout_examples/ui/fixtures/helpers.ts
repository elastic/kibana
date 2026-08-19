/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KbnClient, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { SESSION_API_PATH, SESSION_API_VERSION } from './constants';

const SESSION_HEADERS = {
  [ELASTIC_HTTP_VERSION_HEADER]: SESSION_API_VERSION,
  'kbn-xsrf': 'anything',
  'kbn-system-request': 'true',
};

/**
 * Deletes every search session so leftover sessions do not interfere with later runs.
 */
export async function deleteAllSearchSessions(kbnClient: KbnClient): Promise<void> {
  const { data } = await kbnClient.request<{ saved_objects: Array<{ id: string }> }>({
    method: 'POST',
    path: `${SESSION_API_PATH}/_find`,
    headers: SESSION_HEADERS,
    body: { page: 1, perPage: 10_000, sortField: 'created', sortOrder: 'asc' },
  });

  if (data.saved_objects.length === 0) {
    return;
  }

  await Promise.all(
    data.saved_objects.map(({ id }) =>
      kbnClient.request({
        method: 'DELETE',
        path: `${SESSION_API_PATH}/${id}`,
        headers: SESSION_HEADERS,
        ignoreErrors: [404],
      })
    )
  );
}

/**
 * Saves the in-flight background search via the unified search secondary button
 */
export async function saveBackgroundSearch(page: ScoutPage): Promise<void> {
  const saveButton = page.testSubj.locator('queryCancelButton-secondary-button');
  await saveButton.waitFor({ state: 'visible' });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
}
