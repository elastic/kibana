/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { format as formatUrl } from 'url';
import { coreWorkerFixtures } from '.';

export interface ApiClientOptions {
  headers?: Record<string, string>;
  responseType?: 'json' | 'text';
  body?: any;
}

export interface ApiClientResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[]>;
  body: any;
}

export interface ApiClientFixture {
  get(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  post(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  put(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  delete(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  patch(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  head(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
}

export const apiClientFixture = coreWorkerFixtures.extend<{}, { apiClient: ApiClientFixture }>({
  apiClient: [
    async ({ config, log }, use) => {
      const kibanaServerUrl = formatUrl(config.hosts.kibana);
      const testAgent = supertest(kibanaServerUrl);

      // Map method names to agent functions
      const methodMap: Record<keyof ApiClientFixture, (url: string) => supertest.Test> = {
        get: testAgent.get.bind(testAgent),
        post: testAgent.post.bind(testAgent),
        put: testAgent.put.bind(testAgent),
        delete: testAgent.delete.bind(testAgent),
        patch: testAgent.patch.bind(testAgent),
        head: testAgent.head.bind(testAgent),
      };

      function makeRequest(method: keyof ApiClientFixture) {
        return async (url: string, options: ApiClientOptions = {}): Promise<ApiClientResponse> => {
          const fn = methodMap[method];
          if (!fn) {
            throw new Error(`Unsupported HTTP method: ${method}`);
          }
          let req = fn(url);

          // Apply headers
          if (options.headers) {
            for (const [key, value] of Object.entries(options.headers)) {
              req = req.set(key, value);
            }
          }

          // Set Accept header for JSON if requested
          if (options.responseType === 'json') {
            req = req.set('Accept', 'application/json');
          }

          // Handle body and auto-set Content-Type if needed
          if (options.body !== undefined) {
            const isPlainObject =
              typeof options.body === 'object' &&
              options.body !== null &&
              !Buffer.isBuffer(options.body) &&
              !(options.body instanceof ArrayBuffer) &&
              !(options.body instanceof Uint8Array);

            const hasContentType =
              options.headers &&
              Object.keys(options.headers).some((k) => k.toLowerCase() === 'content-type');

            if (isPlainObject && !hasContentType) {
              req = req.set('Content-Type', 'application/json');
            }

            req = req.send(options.body);
          }

          const res = await req;
          return {
            statusCode: res.status,
            statusMessage: res.text,
            headers: res.headers,
            body: res.body,
          };
        };
      }

      log.serviceLoaded('apiClient at ' + kibanaServerUrl);

      await use({
        get: makeRequest('get'),
        post: makeRequest('post'),
        put: makeRequest('put'),
        delete: makeRequest('delete'),
        patch: makeRequest('patch'),
        head: makeRequest('head'),
      });
    },
    { scope: 'worker' },
  ],
});
