/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SamlSessionManager } from '@kbn/test-saml-auth';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/kbn-client';
import type { ElasticsearchRoleDescriptor, KibanaRole } from '../../../../../common/services';
import {
  createElasticsearchCustomRole,
  createCustomRole,
  isElasticsearchRole,
} from '../../../../../common/services';
import type { ScoutLogger } from '../../../../../common/services/logger';
import type { RoleSessionCredentials } from '../core_fixtures';

export class SamlAuthManager {
  private customRoleHash = '';
  private isCustomRoleCreated = false;

  constructor(
    public readonly session: SamlSessionManager,
    public readonly customRoleName: string,
    private readonly esClient: EsClient,
    private readonly kbnClient: KbnClient,
    private readonly log: ScoutLogger
  ) {}

  async setCustomRole(role: KibanaRole | ElasticsearchRoleDescriptor): Promise<void> {
    const newRoleHash = JSON.stringify(role);

    if (newRoleHash === this.customRoleHash) {
      this.log.debug(
        `Custom role '${this.customRoleName}' with provided privileges already exists, reusing it`
      );
      return;
    }

    this.log.debug(
      this.isCustomRoleCreated
        ? `Overriding existing custom role '${this.customRoleName}'`
        : `Creating custom role '${this.customRoleName}'`
    );

    this.isCustomRoleCreated = true;

    if (isElasticsearchRole(role)) {
      await createElasticsearchCustomRole(this.esClient, this.customRoleName, role);
      this.log.debug(`Created Elasticsearch custom role: ${this.customRoleName}`);
    } else {
      await createCustomRole(this.kbnClient, this.customRoleName, role);
      this.log.debug(`Created Kibana custom role: ${this.customRoleName}`);
    }

    this.customRoleHash = newRoleHash;
  }

  /**
   * Fetches the live descriptor of any named ES role and provisions it as the
   * worker's custom role slot. Works for both built-in ES roles (e.g. `kibana_admin`,
   * `superuser`) and any other role present in Elasticsearch.
   *
   * @param roleName - The name of the role to look up in Elasticsearch.
   */
  async setBuiltinRole(roleName: string): Promise<ElasticsearchRoleDescriptor> {
    const response = await this.esClient.security.getRole({ name: roleName });
    const roleData = response[roleName];
    if (!roleData) {
      throw new Error(`Role '${roleName}' not found in Elasticsearch`);
    }
    // Strip non-privilege metadata before delegating to the generic custom-role path
    const { metadata: _metadata, transient_metadata: _transient, ...descriptor } = roleData;
    await this.setCustomRole(descriptor as ElasticsearchRoleDescriptor);
    return descriptor as ElasticsearchRoleDescriptor;
  }

  async asInteractiveUser(
    role: string | KibanaRole | ElasticsearchRoleDescriptor
  ): Promise<RoleSessionCredentials> {
    let roleName: string;

    if (typeof role === 'string') {
      roleName = role;
    } else {
      await this.setCustomRole(role);
      roleName = this.customRoleName;
    }

    const cookieValue = await this.session.getInteractiveUserSessionCookieWithRoleScope(roleName);
    return { cookieValue, cookieHeader: { Cookie: `sid=${cookieValue}` } };
  }

  async cleanup(): Promise<void> {
    if (!this.isCustomRoleCreated) return;

    this.log.debug(`Deleting custom role ${this.customRoleName}`);
    try {
      await this.esClient.security.deleteRole({ name: this.customRoleName });
      this.log.debug(`Custom role '${this.customRoleName}' deleted`);
      this.customRoleHash = '';
    } catch (error: any) {
      this.log.error(
        `Failed to delete custom role '${this.customRoleName}' during worker cleanup: ${error.message}`
      );
    }
  }
}
