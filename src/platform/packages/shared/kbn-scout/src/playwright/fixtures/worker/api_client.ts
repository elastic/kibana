/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GotRequestFunction } from 'got';
import { coreWorkerFixtures } from '.';

export interface ApiClientFixture {
  get: GotRequestFunction;
  post: GotRequestFunction;
  put: GotRequestFunction;
  delete: GotRequestFunction;
  patch: GotRequestFunction;
  head: GotRequestFunction;
}

export const apiClientFixture = coreWorkerFixtures.extend<{}, { apiClient: ApiClientFixture }>({
  apiClient: [
    async ({ config, log }, use) => {
      const gotModule = await import('got');
      const got = gotModule.default;

      const client = got.extend({
        prefixUrl: config.hosts.kibana,
        throwHttpErrors: false,
        timeout: {
          request: 30_000,
        },
        http2: false, // TODO: Read http2 setting from config: config.http2 ?? false
        headers: {}, // Use default headers from config if provided
      });

      log.serviceLoaded('apiClient');

      await use({
        get: client.get.bind(client),
        post: client.post.bind(client),
        put: client.put.bind(client),
        delete: client.delete.bind(client),
        patch: client.patch.bind(client),
        head: client.head.bind(client),
      });
    },
    { scope: 'worker' },
  ],
});
