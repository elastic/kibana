/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Worker URLs must adhere to the same-origin policy.
 * See https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker.
 *
 * To satisfy the policy we construct a `blob:` URL and use the worker global `importScripts`.
 * So IF we have a full URL to load the worker code via JS APIs instead.
 */
export const prepareWorkerURL = (url: string) => {
  let isFullURL = false;
  try {
    new URL(url);
    isFullURL = true;
  } catch (e) {
    // ignore
  }
  return isFullURL
    ? URL.createObjectURL(new Blob([`importScripts("${url}");`], { type: 'text/javascript' }))
    : url;
};
