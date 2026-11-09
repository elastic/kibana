/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { Logger } from '@kbn/logging';
import { SeededOfrepWebProvider } from './seeded_ofrep_provider';

/** How often the browser asks Kibana for the server's flag snapshot. */
const OFREP_POLL_INTERVAL_MS = 10_000;

/**
 * Path the OFREP web provider treats as its server root.
 * The client appends `/ofrep/v1/evaluate/flags`.
 */
const OFREP_PROVIDER_BASE_PATH = '/internal/feature-flags';

type KibanaHttp = Pick<HttpSetup, 'basePath' | 'fetch'>;

/** Browser provider that evaluates flags through Kibana's internal OFREP routes. */
export function createKibanaOfrepProvider({
  http,
  initialFlags,
  logger,
}: {
  http: KibanaHttp;
  initialFlags: Record<string, unknown>;
  logger: Pick<Logger, 'warn'>;
}): SeededOfrepWebProvider {
  const pathname = http.basePath.prepend(OFREP_PROVIDER_BASE_PATH);
  const baseUrl = new URL(pathname, window.location.origin).toString();

  return new SeededOfrepWebProvider({
    initialFlags,
    logger,
    ofrep: {
      baseUrl,
      fetchImplementation: (input, init) => kibanaFetch(http, input, init),
      // We can decide if we want to use SSE in the future if we need real-time updates.
      changeDetection: 'polling',
      pollInterval: OFREP_POLL_INTERVAL_MS,
    },
  });
}

/**
 * Sends the OFREP client's request through Kibana's HTTP client.
 * The client passes a {@link Request} and reads every status, including 304.
 * `http.fetch` throws for those statuses, so an error that still carries a response is returned as that response.
 */
async function kibanaFetch(
  http: KibanaHttp,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const path = http.basePath.remove(url.pathname);
  const query = Object.fromEntries(url.searchParams.entries());

  try {
    const result = await http.fetch(path, {
      method: request.method,
      body: await requestBody(request),
      headers: forwardedHeaders(request),
      signal: request.signal,
      ...(Object.keys(query).length > 0 ? { query } : {}),
      // A background poll must not count as user activity, or an open tab never idles out.
      asSystemRequest: true,
      asResponse: true,
      rawResponse: true,
    });
    if (!result.response) {
      throw new Error('Feature flag request returned no response');
    }
    return result.response;
  } catch (error) {
    const response = responseFromFetchError(error);
    if (response) {
      return response;
    }
    throw error;
  }
}

/**
 * Kibana's HTTP client sets `Content-Type` itself. Forwarding the request's lowercase
 * `content-type` as well makes the browser send both, and Kibana rejects that MIME type.
 */
function forwardedHeaders(request: Request): Record<string, string> {
  return Object.fromEntries(
    [...request.headers.entries()].filter(([name]) => name.toLowerCase() !== 'content-type')
  );
}

/** An empty body stays unset so requests without a payload do not send one. */
async function requestBody(request: Request): Promise<string | undefined> {
  const body = await request.text();
  return body.length > 0 ? body : undefined;
}

function responseFromFetchError(error: unknown): Response | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }
  return error.response instanceof Response ? error.response : undefined;
}
