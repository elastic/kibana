/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReadyCheck } from './types';

type HttpReadyCheck = Extract<ReadyCheck, { type: 'http' }>;

const DEFAULT_INTERVAL_MS = 1000;

const delay = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

const isHttpReady = async (
  { url, auth }: HttpReadyCheck,
  signal: AbortSignal
): Promise<boolean> => {
  const headers: Record<string, string> = auth
    ? {
        authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
          'base64'
        )}`,
      }
    : {};
  try {
    const response = await fetch(url, { headers, signal });
    await response.arrayBuffer();
    return response.ok;
  } catch {
    return false;
  }
};

/** Polls `check.url` until it answers with a 2xx status; resolves false when `signal` aborts first. */
export const pollUntilHttpReady = async (
  check: HttpReadyCheck,
  signal: AbortSignal
): Promise<boolean> => {
  while (!signal.aborted) {
    if (await isHttpReady(check, signal)) {
      return true;
    }
    await delay(check.intervalMs ?? DEFAULT_INTERVAL_MS, signal);
  }
  return false;
};
