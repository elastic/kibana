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

/**
 * Fetches Kibana version string in the same shape as @kbn/kbn-client KbnClientVersion.get()
 * (for use as the `kbn-version` header on SAML requests). Single GET to `/api/status`; no retries.
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
  const dispatcher = isHttps ? new Agent({ connect: { rejectUnauthorized: false } }) : undefined;

  log.debug(`Fetching Kibana version from ${url.origin}/api/status`);

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
}
