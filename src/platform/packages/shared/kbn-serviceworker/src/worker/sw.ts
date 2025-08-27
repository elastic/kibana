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

import { setCacheNameDetails } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { ServiceWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

declare const self: ServiceWorkerGlobalScope;

let handler: ServiceWorkerMLCEngineHandler;

const initHandler = () => {
  if (!handler) {
    handler = new ServiceWorkerMLCEngineHandler();
  }
};

/**
 * serviceworker for kibana
 * @module sw
 */
((global) => {
  // get version from sw query string
  const swVersion = new URL(global.location.href).searchParams.get('version') ?? '';

  setCacheNameDetails({
    precache: 'kibana-precache',
    runtime: 'kibana-runtime',
    suffix: swVersion,
  });

  precacheAndRoute(self.__WB_MANIFEST);

  registerRoute(
    /.*\/kbn-ui-shared.*\/.*\.js$/,
    new CacheFirst({
      cacheName: 'kibana-shared-ui-deps',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          // cache shared ui deps for two weeks inline with serverless release, maybe change this for other build flavours
          maxAgeSeconds: 60 * 60 * 24 * 14,
        }),
      ],
    })
  );

  global.addEventListener('install', async (event) => {
    // TODO: switch waitUntil to something more meaningful,
    // when we switch to including a prompt to users to reload the page instead of forcing the install
    event.waitUntil(global.skipWaiting());
  });

  global.addEventListener('activate', (event) => {
    initHandler();
    event.waitUntil(global.clients.claim());
  });

  global.addEventListener('message', (event) => {
    initHandler();
  });

  // empty outdated caches
  cleanupOutdatedCaches();
})(self);
