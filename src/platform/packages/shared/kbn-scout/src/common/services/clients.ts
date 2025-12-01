/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEsClientForTesting, KbnClient } from '@kbn/test';
import type { ScoutLogger } from './logger';
import type { ScoutTestConfig, EsClient } from '../../types';

interface ClientOptions {
  serviceName: string;
  url: string;
  username: string;
  password: string;
  log: ScoutLogger;
}

export interface KbnClientProxy {
  admin: KbnClient;
  viewer: KbnClient;
  editor: KbnClient;
}

function createClientUrlWithAuth({ serviceName, url, username, password, log }: ClientOptions) {
  const clientUrl = new URL(url);
  clientUrl.username = username;
  clientUrl.password = password;

  log.serviceLoaded(`${serviceName}Client`);

  return clientUrl.toString();
}

let esClientInstance: EsClient | null = null;
let kbnClientInstance: (KbnClient & KbnClientProxy) | null = null;

export function getEsClient(config: ScoutTestConfig, log: ScoutLogger) {
  if (!esClientInstance) {
    const { username, password } = config.auth;
    const elasticsearchUrl = createClientUrlWithAuth({
      serviceName: 'es',
      url: config.hosts.elasticsearch,
      username,
      password,
      log,
    });

    esClientInstance = createEsClientForTesting({
      esUrl: elasticsearchUrl,
      isCloud: config.isCloud,
      authOverride: { username, password },
    });
  }

  return esClientInstance;
}

export function getKbnClient(config: ScoutTestConfig, log: ScoutLogger) {
  if (!kbnClientInstance) {
    const kibanaUrl = createClientUrlWithAuth({
      serviceName: 'kbn',
      url: config.hosts.kibana,
      username: config.auth.username,
      password: config.auth.password,
      log,
    });

    const viewerKibanaUrl = createClientUrlWithAuth({
      serviceName: 'kbn',
      url: config.hosts.kibana,
      username: config.auth.username, // todo: update to viewer user when available
      password: config.auth.password,
      log,
    });

    const editorKibanaUrl = createClientUrlWithAuth({
      serviceName: 'kbn',
      url: config.hosts.kibana,
      username: config.auth.username, // todo: update to editor user when available
      password: config.auth.password,
      log,
    });
    const handler = {
      admin: new KbnClient({ log, url: kibanaUrl }),
      viewer: new KbnClient({ log, url: viewerKibanaUrl }),
      editor: new KbnClient({ log, url: editorKibanaUrl }),
      get(target: KbnClient, prop: string) {
        if (prop === 'admin') {
          log.serviceMessage('kbnClient', 'admin user');
          return this.admin;
        }
        if (prop === 'viewer') {
          log.serviceMessage('kbnClient', 'viewer user');
          return this.viewer;
        }
        if (prop === 'editor') {
          log.serviceMessage('kbnClient', 'editor user');
          return this.editor;
        }
        return (target as any)[prop];
      },
    };

    kbnClientInstance = new Proxy(handler.admin, handler) as KbnClient & KbnClientProxy;
  }

  return kbnClientInstance;
}
