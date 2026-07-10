/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { SYSTEM_INDICES_SUPERUSER } from '@kbn/es';
import { KbnClient } from '@kbn/kbn-client';
import { createEsClientForTesting } from '@kbn/test-es-server';
import type { ScoutLogger } from './logger';
import type { ScoutTestConfig, EsClient } from '../../types';

interface ClientOptions {
  serviceName: string;
  url: string;
  username: string;
  password: string;
  log: ScoutLogger;
}

function createClientUrlWithAuth({ serviceName, url, username, password, log }: ClientOptions) {
  const clientUrl = new URL(url);
  clientUrl.username = username;
  clientUrl.password = password;

  log.serviceLoaded(`${serviceName}Client`);

  return clientUrl.toString();
}

let esClientInstance: EsClient | null = null;
let kbnClientInstance: KbnClient | null = null;

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

let systemIndicesEsClientInstance: EsClient | null = null;

/**
 * Returns an Elasticsearch client that is allowed to read/write the restricted system
 * indices (e.g. the `.kibana*` saved object indices), which reject writes from the
 * regular `elastic` superuser.
 *
 * On stateful deployments this authenticates as `system_indices_superuser`, a user that
 * `@kbn/es` provisions at cluster startup (with the same password as `elastic`) and whose
 * role carries `allow_restricted_indices: true` — the same override FTR's `es` service
 * applies. Serverless has no such user, so the default client is returned instead,
 * mirroring FTR.
 */
export function getEsClientForSystemIndices(config: ScoutTestConfig, log: ScoutLogger) {
  if (config.serverless) {
    return getEsClient(config, log);
  }

  if (!systemIndicesEsClientInstance) {
    const password = config.auth.password;
    const elasticsearchUrl = createClientUrlWithAuth({
      serviceName: 'systemIndicesEs',
      url: config.hosts.elasticsearch,
      username: SYSTEM_INDICES_SUPERUSER,
      password,
      log,
    });

    systemIndicesEsClientInstance = createEsClientForTesting({
      esUrl: elasticsearchUrl,
      isCloud: config.isCloud,
      authOverride: { username: SYSTEM_INDICES_SUPERUSER, password },
    });
  }

  return systemIndicesEsClientInstance;
}

let linkedEsClientInstance: EsClient | null = null;

export function getLinkedEsClient(config: ScoutTestConfig, log: ScoutLogger) {
  if (!linkedEsClientInstance) {
    const linkedProject = config.linkedProject;
    if (!linkedProject) {
      throw new Error('linkedProject is not configured in ScoutTestConfig');
    }

    const { username, password } = linkedProject.auth;
    const elasticsearchUrl = createClientUrlWithAuth({
      serviceName: 'linkedEs',
      url: linkedProject.hosts.elasticsearch,
      username,
      password,
      log,
    });

    linkedEsClientInstance = createEsClientForTesting({
      esUrl: elasticsearchUrl,
      isCloud: config.isCloud,
      authOverride: { username, password },
    });
  }

  return linkedEsClientInstance;
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

    kbnClientInstance = new KbnClient({
      log,
      url: kibanaUrl,
      ...(config.http2 ? { certificateAuthorities: [readFileSync(CA_CERT_PATH)] } : {}),
    });
  }

  return kbnClientInstance;
}
