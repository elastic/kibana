/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file*/

import fetch from 'node-fetch';
import { RequestInit } from 'node-fetch';
import Path from 'path';
import { kibanaHeaders } from './client_headers';
import { getFetchAgent } from '../../cli/utils/ssl';

type KibanaClientFetchOptions = RequestInit;

export class KibanaClientHttpError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly data?: unknown) {
    super(message);
  }
}

export class KibanaClient {
  private target: string;
  private headers: Record<string, string>;

  constructor(options: { target: string; headers?: Record<string, string> }) {
    this.target = options.target;
    this.headers = { ...kibanaHeaders(), ...(options.headers ?? {}) };
  }

  fetch<T>(pathname: string, options: KibanaClientFetchOptions): Promise<T> {
    const url = new URL(this.target);
    const pathSplitted = pathname.split('?');
    const pathnamePart = pathSplitted[0];
    const searchPart = pathSplitted[1];
    if (searchPart) {
      const searchPartObj = new URLSearchParams(searchPart);
      for (const [key, value] of searchPartObj.entries()) {
        url.searchParams.append(key, value);
      }
    }
    url.pathname = Path.join(url.pathname, pathnamePart);
    return fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
      agent: getFetchAgent(url.toString()),
    }).then(async (response) => {
      if (response.status >= 400) {
        throw new KibanaClientHttpError(
          `Response error for ${options.method?.toUpperCase() ?? 'GET'} ${url}`,
          response.status,
          await response.json().catch((error) => {
            return undefined;
          })
        );
      }
      return response.json();
    });
  }
}
