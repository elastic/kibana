/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

  constructor({
    tenants,
    createClient,
  }: {
    tenants: InternalTenantsServiceSetup;
    createClient: CreateTenantClient;
  }) {
    this.tenants = tenants;
    this.createClient = createClient;
  }

  public resolve({ tenantId }: ScopeableRequest): ICustomClusterClient | undefined {
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
}
