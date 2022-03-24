/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpFetchOptions, HttpResponse, HttpSetup } from 'kibana/public';

const esVersion: string[] = [];

export function getVersion() {
  return esVersion;
}

export function getContentType(body: unknown) {
  if (!body) return;
  return 'application/json';
}

let _http: HttpSetup;

export const initHttp = (http: HttpSetup) => {
  _http = http;
};

interface SendProps {
  method: string;
  path: string;
  data?: string;
  asSystemRequest?: boolean;
  withProductOrigin?: boolean;
  asResponse?: boolean;
}

export async function send({
  method,
  path,
  data,
  asSystemRequest = false,
  withProductOrigin = false,
  asResponse = false,
}: SendProps) {
  const options: HttpFetchOptions = {
    headers: { Accept: 'text/plain', 'Content-Type': getContentType(data) },
    query: { path, method, ...(withProductOrigin && { withProductOrigin }) },
    body: data,
    asResponse,
    asSystemRequest,
  };
  return await _http.post<HttpResponse<unknown>>('../api/console/proxy', options);
}

export function constructESUrl(baseUri: string, path: string) {
  baseUri = baseUri.replace(/\/+$/, '');
  path = path.replace(/^\/+/, '');
  return baseUri + '/' + path;
}
