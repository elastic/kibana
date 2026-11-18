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
import type { Headers } from '@kbn/core-http-server';
import type { TenantId } from '@kbn/core-tenants-server';
import { tenantsConfig, type TenantsConfigType } from './tenants_config';
import { readTenantsFile } from './tenants_file';

const TENANT_ID_HEADER = 'x-elastic-project-id';

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
   * Returns the tenant named by the `x-elastic-project-id` header, or `undefined` without the header
   * or without a tenants file. Throws a 400 error for tenants that the tenants file doesn't list.
   */
  getTenantId(headers: Headers): TenantId | undefined;
  /**
   * Returns the `TenantId` for a stored tenant ID, such as one recorded with background work.
   * Throws for tenants that the tenants file doesn't list.
   */
  resolve(id: string): TenantId;
  /** Returns the Elasticsearch hosts and credentials of a tenant. */
  getClientConfig(tenantId: TenantId): TenantClientConfig;
  /** Returns the project name of a tenant, if the tenants file sets one. */
  getProjectName(tenantId: TenantId): string | undefined;
}

/** @internal */
export interface InternalTenantsServiceStart {
  /** Returns the crypto for the saved objects encryption key of a tenant. */
  getEncryptionCrypto(tenantId: TenantId): Crypto;
  /** Returns the crypto for the session encryption key of a tenant. */
  getSessionCrypto(tenantId: TenantId): Crypto;
}

interface Tenant {
  clientConfig: TenantClientConfig;
  crypto: Crypto;
  sessionCrypto: Crypto;
  projectName?: string;
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
      for (const [
        id,
        { encryptionKey, securityEncryptionKey, projectName, ...clientConfig },
      ] of Object.entries(tenants)) {
        this.tenants.set(id, {
          clientConfig,
          crypto: nodeCrypto({ encryptionKey }),
          sessionCrypto: nodeCrypto({ encryptionKey: securityEncryptionKey }),
          projectName,
        });
      }
    }

    return {
      enabled: this.enabled,
      getTenantId: this.getTenantId,
      resolve: this.resolve,
      getClientConfig: (tenantId) => this.getTenant(tenantId).clientConfig,
      getProjectName: (tenantId) => this.getTenant(tenantId).projectName,
    };
  }

  public start(): InternalTenantsServiceStart {
    return {
      getEncryptionCrypto: (tenantId) => this.getTenant(tenantId).crypto,
      getSessionCrypto: (tenantId) => this.getTenant(tenantId).sessionCrypto,
    };
  }

  public stop() {}

  private getTenantId = (headers: Headers): TenantId | undefined => {
    const value = headers[TENANT_ID_HEADER];
    const id = Array.isArray(value) ? value[0] : value;
    if (!this.enabled || id === undefined) {
      return undefined;
    }
    try {
      return this.resolve(id);
    } catch (error) {
      throw Boom.badRequest(error.message);
    }
  };

  private resolve = (id: string): TenantId => {
    if (!this.tenants.has(id)) {
      throw new Error(`Unknown tenant [${id}]`);
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
