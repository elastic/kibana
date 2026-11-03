/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type {
  ElasticsearchClientConfig,
  ICustomClusterClient,
  ScopeableRequest,
} from '@kbn/core-elasticsearch-server';
import type { TenantConfig } from './tenants_file';

const PROJECT_ID_HEADER = 'x-elastic-project-id';

const getProjectIdHeader = (request: ScopeableRequest): string | undefined => {
  const value = request.headers?.[PROJECT_ID_HEADER];
  return Array.isArray(value) ? value[0] : value;
};

export type CreateTenantClient = (
  projectId: string,
  clientConfig: Partial<ElasticsearchClientConfig>
) => ICustomClusterClient;

export class TenantClients {
  private readonly tenants: Map<string, TenantConfig>;
  private readonly clients = new Map<string, ICustomClusterClient>();
  private readonly createClient: CreateTenantClient;
  private readonly log: Logger;

  constructor({
    tenants,
    createClient,
    log,
  }: {
    tenants: Record<string, TenantConfig>;
    createClient: CreateTenantClient;
    log: Logger;
  }) {
    this.tenants = new Map(Object.entries(tenants));
    this.createClient = createClient;
    this.log = log;
  }

  public registerGuard(http: Pick<InternalHttpServiceSetup, 'registerOnPreAuth'>) {
    http.registerOnPreAuth((request, response, toolkit) => {
      const projectId = this.getProjectId(request);
      if (projectId === undefined || this.tenants.has(projectId)) {
        return toolkit.next();
      }
      return response.badRequest({ body: `Unknown project [${projectId}]` });
    });
  }

  public resolve(request: ScopeableRequest): ICustomClusterClient | undefined {
    const projectId = this.getProjectId(request);
    if (projectId === undefined) {
      return undefined;
    }

    const tenant = this.tenants.get(projectId);
    if (!tenant) {
      throw new Error(`Unknown project [${projectId}]`);
    }

    let client = this.clients.get(projectId);
    if (!client) {
      const { encryptionKey, ...clientConfig } = tenant;
      client = this.createClient(projectId, clientConfig);
      this.clients.set(projectId, client);
    }
    return client;
  }

  public getProjectEncryptionKey(request: ScopeableRequest): string | undefined {
    const projectId = this.getProjectId(request);
    return projectId === undefined ? undefined : this.tenants.get(projectId)?.encryptionKey;
  }

  public async close() {
    await Promise.all([...this.clients.values()].map((client) => client.close()));
  }

  private getProjectId(request: ScopeableRequest) {
    if (request.projectId !== undefined) {
      return request.projectId;
    }
    const projectId = getProjectIdHeader(request);
    if (projectId !== undefined) {
      this.log.debug(`Read project [${projectId}] from the request headers, not request.projectId`);
    }
    return projectId;
  }
}
