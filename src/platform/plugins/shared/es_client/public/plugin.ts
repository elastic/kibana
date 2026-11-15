/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { EsClient } from './es_client/types';
import { proxyService } from './proxy_service';

export interface EsClientPluginSetup {
  /**
   * Resolves with an elasticsearch-js API client that sends every call through the proxy. The
   * client code is loaded on first use.
   */
  getClient: () => Promise<EsClient>;
}

export type EsClientPluginStart = EsClientPluginSetup;

export class EsClientPlugin implements Plugin<EsClientPluginSetup, EsClientPluginStart, {}, {}> {
  public setup({ http }: CoreSetup): EsClientPluginSetup {
    return proxyService(http);
  }

  public start({ http }: CoreStart): EsClientPluginStart {
    return proxyService(http);
  }

  public stop() {}
}
