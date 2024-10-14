/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SamlSessionManager } from '@kbn/test';
import expect from '@kbn/expect';
import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';
import { FtrProviderContext } from '../ftr_provider_context';
import { getAuthProvider } from './get_auth_provider';
import { InternalRequestHeader } from './default_request_headers';

export interface RoleCredentials {
  apiKey: { id: string; name: string };
  apiKeyHeader: { Authorization: string };
}

export interface CookieCredentials {
  Cookie: string;
  // supertest.set() expects an object that matches IncomingHttpHeaders type, that needs to accept arbitrary key-value pairs as headers
  // We extend the interface with an index signature to resolve this.
  [header: string]: string;
}

export interface KibanaRoleDescriptors {
  kibana: any;
  elasticsearch?: any;
}

const throwIfRoleNotSet = (role: string, customRole: string, roleDescriptors: Map<string, any>) => {
  if (role === customRole && !roleDescriptors.has(customRole)) {
    throw new Error(
      `Set privileges for '${customRole}' using 'samlAuth.setCustomRole' before authentication.`
    );
  }
};

export function SamlAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const isCloud = !!process.env.TEST_CLOUD;

  const authRoleProvider = getAuthProvider({ config });
  const supportedRoleDescriptors = authRoleProvider.getSupportedRoleDescriptors();
  const supportedRoles = Array.from(supportedRoleDescriptors.keys());
  const customRolesFileName = process.env.ROLES_FILENAME_OVERRIDE;
  const cloudUsersFilePath = resolve(REPO_ROOT, '.ftr', customRolesFileName ?? 'role_users.json');

  // Sharing the instance within FTR config run means cookies are persistent for each role between tests.
  const sessionManager = new SamlSessionManager({
    hostOptions: {
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: isCloud ? undefined : config.get('servers.kibana.port'),
      username: config.get('servers.kibana.username'),
      password: config.get('servers.kibana.password'),
    },
    log,
    isCloud,
    supportedRoles: {
      roles: supportedRoles,
      sourcePath: authRoleProvider.getRolesDefinitionPath(),
    },
    cloudUsersFilePath,
  });

  const DEFAULT_ROLE = authRoleProvider.getDefaultRole();
  const COMMON_REQUEST_HEADERS = authRoleProvider.getCommonRequestHeader();
  const INTERNAL_REQUEST_HEADERS = authRoleProvider.getInternalRequestHeader();
  const CUSTOM_ROLE = authRoleProvider.getCustomRole();
  const isCustomRoleEnabled = authRoleProvider.isCustomRoleEnabled();

  const getAdminCredentials = async () => {
    return await sessionManager.getApiCredentialsForRole('admin');
  };

  const createApiKeyPayload = (role: string, roleDescriptors: any) => {
    return {
      name: `myTestApiKey_${role}`,
      metadata: {},
      ...(role === CUSTOM_ROLE
        ? { kibana_role_descriptors: roleDescriptors }
        : { role_descriptors: roleDescriptors }),
    };
  };

  return {
    async getInteractiveUserSessionCookieWithRoleScope(role: string) {
      // Custom role has no descriptors by default, check if it was added before authentication
      throwIfRoleNotSet(role, CUSTOM_ROLE, supportedRoleDescriptors);
      return sessionManager.getInteractiveUserSessionCookieWithRoleScope(role);
    },

    async getM2MApiCookieCredentialsWithRoleScope(role: string): Promise<CookieCredentials> {
      // Custom role has no descriptors by default, check if it was added before authentication
      throwIfRoleNotSet(role, CUSTOM_ROLE, supportedRoleDescriptors);
      return sessionManager.getApiCredentialsForRole(role);
    },

    async getEmail(role: string) {
      return sessionManager.getEmail(role);
    },

    async getUserData(role: string) {
      return sessionManager.getUserData(role);
    },

    async createM2mApiKeyWithDefaultRoleScope() {
      log.debug(`Creating API key for default role: [${DEFAULT_ROLE}]`);
      return this.createM2mApiKeyWithRoleScope(DEFAULT_ROLE);
    },

    async createM2mApiKeyWithRoleScope(role: string): Promise<RoleCredentials> {
      // Get admin credentials in order to create the API key
      const adminCookieHeader = await getAdminCredentials();
      let roleDescriptors = {};

      if (role !== 'admin') {
        if (role === CUSTOM_ROLE && !isCustomRoleEnabled) {
          throw new Error(`Custom roles are not supported for the current deployment`);
        }
        const roleDescriptor = supportedRoleDescriptors.get(role);
        if (!roleDescriptor) {
          throw new Error(
            role === CUSTOM_ROLE
              ? `Before creating API key for '${CUSTOM_ROLE}', use 'samlAuth.setCustomRole' to set the role privileges`
              : `Cannot create API key for non-existent role "${role}"`
          );
        }
        log.debug(
          `Creating API key for ${role} with privileges: ${JSON.stringify(roleDescriptor)}`
        );
        roleDescriptors = { [role]: roleDescriptor };
      }

      const payload = createApiKeyPayload(role, roleDescriptors);
      const response = await supertestWithoutAuth
        .post('/internal/security/api_key')
        .set(INTERNAL_REQUEST_HEADERS)
        .set(adminCookieHeader)
        .send(payload);

      if (response.status !== 200) {
        throw new Error(
          `Failed to create API key for '${role}' role with response text: ${response.text}`
        );
      }

      const apiKey = response.body;
      const apiKeyHeader = { Authorization: 'ApiKey ' + apiKey.encoded };

      log.debug(`Created API key for role: [${role}]`);
      return { apiKey, apiKeyHeader };
    },

    async invalidateM2mApiKeyWithRoleScope(roleCredentials: RoleCredentials) {
      // Get admin credentials in order to invalidate the API key
      const adminCookieHeader = await getAdminCredentials();

      const { status } = await supertestWithoutAuth
        .post('/internal/security/api_key/invalidate')
        .set(INTERNAL_REQUEST_HEADERS)
        .set(adminCookieHeader)
        .send({
          apiKeys: [{ id: roleCredentials.apiKey.id, name: roleCredentials.apiKey.name }],
          isAdmin: true,
        });

      expect(status).to.be(200);
    },

    async setCustomRole(descriptors: KibanaRoleDescriptors) {
      if (!isCustomRoleEnabled) {
        throw new Error(`Custom roles are not supported for the current deployment`);
      }
      log.debug(`Updating role ${CUSTOM_ROLE}`);
      const adminCookieHeader = await getAdminCredentials();

      const customRoleDescriptors = {
        kibana: descriptors.kibana,
        elasticsearch: descriptors.elasticsearch ?? [],
      };

      const { status } = await supertestWithoutAuth
        .put(`/api/security/role/${CUSTOM_ROLE}`)
        .set(INTERNAL_REQUEST_HEADERS)
        .set(adminCookieHeader)
        .send(customRoleDescriptors);

      expect(status).to.be(204);

      // Update descriptors for custome role, it will be used to create API key
      supportedRoleDescriptors.set(CUSTOM_ROLE, customRoleDescriptors);
    },

    getCommonRequestHeader() {
      return COMMON_REQUEST_HEADERS;
    },

    getInternalRequestHeader(): InternalRequestHeader {
      return INTERNAL_REQUEST_HEADERS;
    },

    DEFAULT_ROLE,
    CUSTOM_ROLE,
  };
}
