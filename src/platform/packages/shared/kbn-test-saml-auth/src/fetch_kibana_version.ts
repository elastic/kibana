/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent } from 'undici';
import type { ToolingLog } from '@kbn/tooling-log';

interface KibanaStatusResponse {
  version?: {
    number: string;
    build_snapshot: boolean;
  };
}

// undici's default `connect.timeout` is 10s, too tight for Cloud; @kbn/kbn-client uses 60s.
const CONNECT_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 5;

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Fetches Kibana version string in the same shape as @kbn/kbn-client KbnClientVersion.get()
 * (for use as the `kbn-version` header on SAML requests). Idempotent GET to `/api/status`, retried
 * up to 5 times with linear backoff so a transient network failure doesn't fail the caller.
 */
export async function fetchKibanaVersionHeaderString(
  kbnBaseUrl: string,
  username: string,
  password: string,
  log: ToolingLog
): Promise<string> {
  const base = kbnBaseUrl.endsWith('/') ? kbnBaseUrl : `${kbnBaseUrl}/`;
  const url = new URL('api/status', base);
  url.searchParams.set('v8format', 'true');

  const isHttps = url.protocol === 'https:';
  const dispatcher = isHttps
    ? new Agent({ connect: { rejectUnauthorized: false, timeout: CONNECT_TIMEOUT_MS } })
    : undefined;

  for (let attempt = 1; ; attempt++) {
    log.debug(`Fetching Kibana version from ${url.origin}/api/status`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          'kbn-xsrf': 'kbn-client',
          'x-elastic-internal-origin': 'kbn-client',
        },
        ...(dispatcher ? { dispatcher } : {}),
      } as RequestInit);

      // 200 (running) and 503 (initializing) both expose `version`, any other status is unexpected.
      if (response.status !== 200 && response.status !== 503) {
        throw new Error(`${response.status}:${await response.text()}`);
      }

      const data = (await response.json()) as KibanaStatusResponse;
      if (!data?.version) {
        throw new Error(
          `Unable to get version from Kibana, invalid response from server: ${JSON.stringify(data)}`
        );
      }

      return data.version.number + (data.version.build_snapshot ? '-SNAPSHOT' : '');
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) {
        throw error;
      }

      log.debug(
        `Fetching Kibana version failed, attempt ${attempt}/${MAX_ATTEMPTS}: ${
          (error as Error).message
        }`
      );
      await delay(1000 * attempt);
    }
  }
}
