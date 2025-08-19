/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line spaced-comment, @typescript-eslint/triple-slash-reference
/// <reference lib="WebWorker" />

import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { ServiceWorkerTaskFramework } from './task_handler';

declare const self: ServiceWorkerGlobalScope;

/**
 * serviceworker for kibana
 * @module sw
 */
(async (global) => {
  // get version from sw query string
  const swVersion = new URL(global.location.href).searchParams.get('version') ?? '';

  // Service worker code goes here
  await global.skipWaiting();
  clientsClaim();

  // empty outdated caches
  cleanupOutdatedCaches();

  setCacheNameDetails({
    precache: 'kibana-precache',
    runtime: 'kibana-runtime',
    suffix: swVersion,
  });

  precacheAndRoute(self.__WB_MANIFEST);

  // Initialize the framework
  const taskFramework = new ServiceWorkerTaskFramework();

  // Register built-in tasks
  taskFramework.registerTask({
    id: 'cache-cleanup',
    handler: async (data) => {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter((name) =>
        data.excludePatterns?.some((pattern: string) => !name.includes(pattern))
      );

      await Promise.all(oldCaches.map((name) => caches.delete(name)));
      return { deletedCaches: oldCaches };
    },
    options: { timeout: 10000 },
  });

  taskFramework.registerTask({
    id: 'fetch-and-cache',
    handler: async (data) => {
      const { url, cacheKey } = data;
      const cache = await caches.open(cacheKey || 'default');
      const response = await fetch(url);
      await cache.put(url, response.clone());
      return { cached: url, status: response.status };
    },
    options: { timeout: 15000, retry: true, maxRetries: 2 },
  });
})(self);
