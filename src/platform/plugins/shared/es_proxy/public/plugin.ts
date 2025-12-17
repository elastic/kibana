/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  HttpSetup,
} from '@kbn/core/public';
import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';

type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH';

const request =
  (http: HttpSetup) =>
  <T>({ method, path, body }: { method: HttpMethod; path: string; body?: string }) =>
    http.fetch<T>(`/api/es_proxy/${path}`, { method, body });

export interface EsProxyPluginSetup {
  request: <T>({
    method,
    path,
    body,
  }: {
    method: HttpMethod;
    path: string;
    body: string;
  }) => Promise<T>;
}

export type EsProxyPluginStart = EsProxyPluginSetup;

export class EsProxyPlugin implements Plugin<EsProxyPluginSetup, EsProxyPluginStart, {}, {}> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup({ http }: CoreSetup) {
    return {
      request: request(http),
    };
  }

  public start({ http }: CoreStart) {
    // Example usage of the es_proxy request function
    request(http)<InfoResponse>({ method: 'GET', path: '' }).then((response) => {
      console.log('Get cluster info:');
      console.log(response);
    });

    return {
      request: request(http),
    };
  }

  public stop() {}
}
