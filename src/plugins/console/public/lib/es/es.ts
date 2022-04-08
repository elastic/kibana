/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpResponse, HttpSetup } from 'kibana/public';
import { parse } from 'query-string';
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
    const _method = method.toLowerCase() as Method;
    const hasQueryParams = path.includes('?');
    const [pathname, queryString] = path.split('?');
    const url = hasQueryParams
      ? `/${trimStart(pathname.split(KIBANA_API_KEYWORD)[1], '/')}`
      : `/${trimStart(path.split(KIBANA_API_KEYWORD)[1], '/')}`;
    const query = hasQueryParams ? parse(queryString) : {};

    return await http[_method]<HttpResponse>(url, {
      ...(data && { body: data }),
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
