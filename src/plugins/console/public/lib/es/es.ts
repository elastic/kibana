/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpResponse, HttpSetup } from 'kibana/public';
import { trimStart } from 'lodash';
import { API_BASE_PATH, KIBANA_API_KEYWORD } from '../../../common/constants';

const esVersion: string[] = [];

export function getVersion() {
  return esVersion;
}

export function getContentType(body: unknown) {
  if (!body) return;
  return 'application/json';
}

interface SendProps {
  http: HttpSetup;
  method: string;
  path: string;
  data?: string;
  asSystemRequest?: boolean;
  withProductOrigin?: boolean;
  asResponse?: boolean;
}

type Method = 'get' | 'post' | 'delete' | 'put' | 'head';

export async function send({
  http,
  method,
  path,
  data,
  asSystemRequest = false,
  withProductOrigin = false,
  asResponse = false,
}: SendProps) {
  const isKibanaApiRequest = path.includes(KIBANA_API_KEYWORD);

  if (isKibanaApiRequest) {
    const httpMethod = method.toLowerCase() as Method;
    const uri = new URL(
      `${window.location.origin}/${trimStart(path.replace(KIBANA_API_KEYWORD, ''), '/')}`
    );
    const { pathname, searchParams } = uri;
    const query = Object.fromEntries(searchParams.entries());
    const body = ['post', 'put'].includes(httpMethod) ? data : null;

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

export function constructUrl(baseUri: string, path: string) {
  baseUri = baseUri.replace(/\/+$/, '');
  path = path.replace(/^\/+/, '');
  return baseUri + '/' + path;
}
