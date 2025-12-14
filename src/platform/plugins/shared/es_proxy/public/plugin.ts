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

type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH';

const request = (http: HttpSetup) => (method: HttpMethod, path: string, body: string) =>
  http.fetch(`/api/es_proxy/${path}`, { method, body });

export class EsProxyPlugin implements Plugin<{}, {}, {}, {}> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup({ http }: CoreSetup) {
    return {
      request: request(http),
    };
  }

  public start({ http }: CoreStart) {
    return {
      request: request(http),
    };
  }

  public stop() {}
}
