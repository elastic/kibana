/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import Boom from '@hapi/boom';
import nodeCrypto, { type Crypto } from '@elastic/node-crypto';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { Headers, KibanaRequest } from '@kbn/core-http-server';
import type { TenantId } from '@kbn/core-tenants-server';
import { tenantsConfig, type TenantsConfigType } from './tenants_config';
import { readTenantsFile } from './tenants_file';

const TENANT_ID_HEADER = 'x-elastic-tenant-id';

/** Elasticsearch hosts and credentials of a tenant. */
export interface TenantClientConfig {
  readonly hosts: string[];
  readonly username?: string;
  readonly password?: string;
  readonly serviceAccountToken?: string;
}

/** @internal */
export interface InternalTenantsServiceSetup {
  /** Whether a tenants file is configured. */
  readonly enabled: boolean;
  /**
   * Returns the tenant named by the `x-elastic-tenant-id` header, or `undefined` without the header
   * or without a tenants file. Throws a 400 error for tenants that the tenants file doesn't list.
   */
  getTenantId(headers: Headers): TenantId | undefined;
  /** Returns the Elasticsearch hosts and credentials of a tenant. */
  getClientConfig(tenantId: TenantId): TenantClientConfig;
}

/** @internal */
export interface InternalTenantsServiceStart {
  /**
   * Returns the crypto for the saved objects encryption key of the request's tenant, if the tenant has a key.
   * Throws for fake requests that target a tenant, so a tenant's key only serves requests received over HTTP.
   */
  getEncryptionCrypto(request: KibanaRequest): Crypto | undefined;
  /**
   * Returns the crypto for the session encryption key of the request's tenant, if the tenant has a key.
   * Throws for fake requests that target a tenant, so a tenant's key only serves requests received over HTTP.
   */
  getSessionCrypto(request: KibanaRequest): Crypto | undefined;
}

interface Tenant {
  clientConfig: TenantClientConfig;
  crypto?: Crypto;
  sessionCrypto?: Crypto;
}

/** @internal */
export class TenantsService
  implements CoreService<InternalTenantsServiceSetup, InternalTenantsServiceStart>
{
  private enabled = false;
  private readonly tenants = new Map<string, Tenant>();

  constructor(private readonly coreContext: CoreContext) {}

  public async setup(): Promise<InternalTenantsServiceSetup> {
    const { file } = await firstValueFrom(
      this.coreContext.configService.atPath<TenantsConfigType>(tenantsConfig.path)
    );
    if (file) {
      this.enabled = true;
      const tenants = await readTenantsFile(file);
      for (const [id, { encryptionKey, securityEncryptionKey, ...clientConfig }] of Object.entries(
        tenants
      )) {
        this.tenants.set(id, {
          clientConfig,
          crypto: encryptionKey ? nodeCrypto({ encryptionKey }) : undefined,
          sessionCrypto: securityEncryptionKey
            ? nodeCrypto({ encryptionKey: securityEncryptionKey })
            : undefined,
        });
      }
    }

    return {
      enabled: this.enabled,
      getTenantId: this.getTenantId,
      getClientConfig: (tenantId) => this.getTenant(tenantId).clientConfig,
    };
  }

  public start(): InternalTenantsServiceStart {
    return {
      getEncryptionCrypto: (request) => this.getRequestTenant(request)?.crypto,
      getSessionCrypto: (request) => this.getRequestTenant(request)?.sessionCrypto,
    };
  }

  public stop() {}

  private getRequestTenant(request: KibanaRequest) {
    const tenantId = request.tenantId ?? this.getTenantId(request.headers);
    if (tenantId === undefined) {
      return undefined;
    }
    if (request.isFakeRequest) {
      throw new Error(
        `The encryption key of tenant [${tenantId}] is only available to requests received over HTTP`
      );
    }
    return this.getTenant(tenantId);
  }

  private getTenantId = (headers: Headers): TenantId | undefined => {
    const value = headers[TENANT_ID_HEADER];
    const id = Array.isArray(value) ? value[0] : value;
    if (!this.enabled || id === undefined) {
      return undefined;
    }
    if (!this.tenants.has(id)) {
      throw Boom.badRequest(`Unknown tenant [${id}]`);
    }
    return id as TenantId;
  };

  private getTenant(tenantId: TenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Unknown tenant [${tenantId}]`);
    }
    return tenant;
  }
}
