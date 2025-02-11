/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpResponse, HttpSetup } from '@kbn/core/public';
import { trimStart, trimEnd } from 'lodash';
import { API_BASE_PATH, KIBANA_API_PREFIX } from '../../../common/constants';

const esVersion: string[] = [];

export function getVersion() {
  return esVersion;
}

export function getContentType(body: unknown) {
  if (!body) return;
  return 'application/json';
}

interface SendConfig {
  http: HttpSetup;
  method: string;
  path: string;
  data?: string;
  asSystemRequest?: boolean;
  withProductOrigin?: boolean;
  asResponse?: boolean;
}

type Method = 'get' | 'post' | 'delete' | 'put' | 'patch' | 'head';

export async function send({
  http,
  method,
  path,
  data,
  asSystemRequest = false,
  withProductOrigin = false,
  asResponse = false,
}: SendConfig) {
  const kibanaRequestUrl = getKibanaRequestUrl(path);

  if (kibanaRequestUrl) {
    const httpMethod = method.toLowerCase() as Method;
    const url = new URL(kibanaRequestUrl);
    const { pathname, searchParams } = url;
    const query = Object.fromEntries(searchParams.entries());
    const body = ['post', 'put', 'patch'].includes(httpMethod) ? data : null;

    return await http[httpMethod]<HttpResponse>(pathname, {
      body,
      query,
      asResponse,
      asSystemRequest,
    });
  }

  return await http.post<HttpResponse>(`${API_BASE_PATH}/proxy`, {
    query: { path, method, ...(withProductOrigin && { withProductOrigin }) },
    body: data,
    asResponse,
    asSystemRequest,
  });
}

function getKibanaRequestUrl(path: string) {
  const isKibanaApiRequest = path.startsWith(KIBANA_API_PREFIX);
  const kibanaBasePath = window.location.origin;

  if (isKibanaApiRequest) {
    // window.location.origin is used as a Kibana public base path for sending requests in cURL commands. E.g. "Copy as cURL".
    return `${kibanaBasePath}/${trimStart(path.replace(KIBANA_API_PREFIX, ''), '/')}`;
  }
}

export function constructUrl(baseUri: string, path: string) {
  const kibanaRequestUrl = getKibanaRequestUrl(path);
  let url = `${trimEnd(baseUri, '/')}/${trimStart(path, '/')}`;

  if (kibanaRequestUrl) {
    url = kibanaRequestUrl;
  }

  const { origin, pathname, search } = new URL(url);
  return `${origin}${encodePathname(pathname)}${search ?? ''}`;
}

const encodePathname = (path: string) => {
  const decodedPath = new URLSearchParams(`path=${path}`).get('path') ?? '';

  // Skip if it is valid
  if (path === decodedPath) {
    return path;
  }

  return `/${encodeURIComponent(trimStart(decodedPath, '/'))}`;
};
