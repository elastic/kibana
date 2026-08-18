/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KbnClient } from '@kbn/scout';
import { SESSION_API_PATH } from './constants';

// Version header required by the background search internal API.
const SESSION_VERSION = '1';
const SESSION_HEADERS = {
  [ELASTIC_HTTP_VERSION_HEADER]: SESSION_VERSION,
  'kbn-xsrf': 'anything',
  'kbn-system-request': 'true',
};

const spacePrefix = (spaceId: string) => (spaceId === 'default' ? '' : `/s/${spaceId}`);

/**
 * Delete every background search in the given Kibana space. Specs that create background
 * searches must call this in `afterAll` — leftover sessions interfere with other suites
 * that assert on the `_find` API.
 */
export const deleteAllBackgroundSearches = async (kbnClient: KbnClient, spaceId: string) => {
  const prefix = spacePrefix(spaceId);
  const { data } = await kbnClient.request<{ saved_objects: Array<{ id: string }> }>({
    method: 'POST',
    path: `${prefix}${SESSION_API_PATH}/_find`,
    headers: SESSION_HEADERS,
    body: { page: 1, perPage: 10_000, sortField: 'created', sortOrder: 'asc' },
  });

  if (data.saved_objects.length === 0) return;

  await Promise.all(
    data.saved_objects.map(({ id }) =>
      kbnClient.request({
        method: 'DELETE',
        path: `${prefix}${SESSION_API_PATH}/${id}`,
        headers: SESSION_HEADERS,
        ignoreErrors: [404],
      })
    )
  );
};
