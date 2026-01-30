/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fetch from 'node-fetch';

/**
 * Resolves the Kibana base URL by detecting if there's a dev mode base path.
 *
 * When Kibana runs in dev mode without the `--no-base-path` flag, it uses a random
 * 3-letter base path prefix (e.g., `/abc`). This function detects that by making
 * a request to the root URL and checking the redirect location.
 *
 * @param kibanaHostname - The base Kibana URL (e.g., "http://localhost:5601")
 * @param log - Optional logger for debugging
 * @returns The Kibana URL with base path included (e.g., "http://localhost:5601/abc")
 */
export async function resolveKibanaUrl(kibanaHostname: string, log?: ToolingLog): Promise<string> {
  try {
    // Make a request to the root URL without following redirects
    const response = await fetch(kibanaHostname, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'kbn-xsrf': 'true',
      },
    });

    // Check if we got a redirect response
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';

      // Check if it looks like a dev mode base path (3-letter pattern like /abc)
      // The pattern matches paths like "/abc" where abc is any 3 word characters
      const hasBasePath = /^\/\w{3}$/.test(location);

      if (hasBasePath) {
        const resolvedUrl = `${kibanaHostname}${location}`;
        log?.debug(`Detected dev mode base path: ${location}`);
        log?.debug(`Resolved Kibana URL: ${resolvedUrl}`);
        return resolvedUrl;
      }
    }

    // No base path detected or request succeeded without redirect
    log?.debug(`No dev mode base path detected, using: ${kibanaHostname}`);
    return kibanaHostname;
  } catch (error: any) {
    // If we can't connect, just return the original URL
    // The actual API call will handle the connection error
    log?.debug(
      `Could not detect base path (${error.code || error.message}), using: ${kibanaHostname}`
    );
    return kibanaHostname;
  }
}
