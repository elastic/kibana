/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type {
  ElasticsearchClientConfig,
  ICustomClusterClient,
  ScopeableRequest,
} from '@kbn/core-elasticsearch-server';
import type { TenantId } from '@kbn/core-tenants-server';
import type { InternalTenantsServiceSetup } from '@kbn/core-tenants-server-internal';

export type CreateTenantClient = (
  tenantId: TenantId,
  clientConfig: Partial<ElasticsearchClientConfig>
) => ICustomClusterClient;

export class TenantClients {
  private readonly clients = new Map<TenantId, ICustomClusterClient>();
  private readonly tenants: InternalTenantsServiceSetup;
  private readonly createClient: CreateTenantClient;
  private readonly log: Logger;

  constructor({
    tenants,
    createClient,
    log,
  }: {
    tenants: InternalTenantsServiceSetup;
    createClient: CreateTenantClient;
    log: Logger;
  }) {
    this.tenants = tenants;
    this.createClient = createClient;
    this.log = log;
  }

  public resolve(request: ScopeableRequest): ICustomClusterClient | undefined {
    const tenantId = this.getTenantId(request);
    if (tenantId === undefined) {
      return undefined;
    }

    let client = this.clients.get(tenantId);
    if (!client) {
      client = this.createClient(tenantId, this.tenants.getClientConfig(tenantId));
      this.clients.set(tenantId, client);
    }
    return client;
  }

  public async close() {
    await Promise.all([...this.clients.values()].map((client) => client.close()));
  }

  private getTenantId(request: ScopeableRequest) {
    if (request.tenantId !== undefined) {
      return request.tenantId;
    }
    const tenantId = this.tenants.getTenantId(request.headers);
    if (tenantId !== undefined) {
      this.log.debug(`Read tenant [${tenantId}] from the request headers, not request.tenantId`);
    }
    return tenantId;
  }
}
