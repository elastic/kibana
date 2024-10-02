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

export interface CustomRolePrivilliages {
  kibana: any;
  elasticsearch?: any;
}

const throwErrorIfCustomRoleIsNotSet = (
  currentRole: string,
  customeRoleName: string,
  roleDescriptors: Map<string, any>
) => {
  if (currentRole === customeRoleName && !roleDescriptors.get(customeRoleName)) {
    throw new Error(
      `Set privilliages for '${customeRoleName}' role using 'samlAuth.setCustomRole' before authentication`
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

  const customRolesFileName: string | undefined = process.env.ROLES_FILENAME_OVERRIDE;
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

  return {
    async getInteractiveUserSessionCookieWithRoleScope(role: string) {
      throwErrorIfCustomRoleIsNotSet(role, CUSTOM_ROLE, supportedRoleDescriptors);
      return sessionManager.getInteractiveUserSessionCookieWithRoleScope(role);
    },
    async getM2MApiCookieCredentialsWithRoleScope(role: string): Promise<CookieCredentials> {
      throwErrorIfCustomRoleIsNotSet(role, CUSTOM_ROLE, supportedRoleDescriptors);
      return sessionManager.getApiCredentialsForRole(role);
    },
    async getEmail(role: string) {
      return sessionManager.getEmail(role);
    },

    async getUserData(role: string) {
      return sessionManager.getUserData(role);
    },
    async createM2mApiKeyWithDefaultRoleScope() {
      log.debug(`Creating api key for default role: [${this.DEFAULT_ROLE}]`);
      return this.createM2mApiKeyWithRoleScope(this.DEFAULT_ROLE);
    },
    async createM2mApiKeyWithRoleScope(role: string): Promise<RoleCredentials> {
      // Get admin credentials in order to create the API key
      const adminCookieHeader = await this.getM2MApiCookieCredentialsWithRoleScope('admin');

      // Get the role descrtiptor for the role
      let roleDescriptors = {};
      if (role !== 'admin') {
        const roleDescriptor = supportedRoleDescriptors.get(role);
        if (!roleDescriptor) {
          throw new Error(
            role === CUSTOM_ROLE
              ? `Update privilliages for '${CUSTOM_ROLE}' role using 'samlAuth.setCustomRole' before creating API key`
              : `Cannot create API key for non-existent role "${role}"`
          );
        }
        log.debug(
          `Creating api key for ${role} role with the following privileges ${JSON.stringify(
            roleDescriptor
          )}`
        );
        roleDescriptors = {
          [role]: roleDescriptor,
        };
      }

      const { body, status } = await supertestWithoutAuth
        .post('/internal/security/api_key')
        .set(INTERNAL_REQUEST_HEADERS)
        .set(adminCookieHeader)
        .send({
          name: 'myTestApiKey',
          metadata: {},
          role_descriptors: roleDescriptors,
        });
      expect(status).to.be(200);

      const apiKey = body;
      const apiKeyHeader = { Authorization: 'ApiKey ' + apiKey.encoded };

      log.debug(`Created api key for role: [${role}]`);
      return { apiKey, apiKeyHeader };
    },
    async invalidateM2mApiKeyWithRoleScope(roleCredentials: RoleCredentials) {
      // Get admin credentials in order to invalidate the API key
      const adminCookieHeader = await this.getM2MApiCookieCredentialsWithRoleScope('admin');

      const requestBody = {
        apiKeys: [
          {
            id: roleCredentials.apiKey.id,
            name: roleCredentials.apiKey.name,
          },
        ],
        isAdmin: true,
      };

      const { status } = await supertestWithoutAuth
        .post('/internal/security/api_key/invalidate')
        .set(INTERNAL_REQUEST_HEADERS)
        .set(adminCookieHeader)
        .send(requestBody);

      expect(status).to.be(200);
    },

    async setCustomRole(privilliages: CustomRolePrivilliages) {
      log.debug(`updating role ${CUSTOM_ROLE}`);
      const adminCookieHeader = await this.getM2MApiCookieCredentialsWithRoleScope('admin');

      const { status } = await supertestWithoutAuth
        .put(`/api/security/role/${CUSTOM_ROLE}`)
        .set(INTERNAL_REQUEST_HEADERS)
        .set(adminCookieHeader)
        .send({
          kibana: privilliages.kibana,
          elasticsearch: privilliages.elasticsearch,
        });
      expect(status).to.be(204);
      // update descriptors for custome role
      supportedRoleDescriptors.set(CUSTOM_ROLE, privilliages);
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
