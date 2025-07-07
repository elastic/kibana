/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { resolve, join } from 'path';
import { readFileSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { HostOptions } from '@kbn/test';
import { SamlSessionManager } from '@kbn/test';
import type { SecurityRoleName } from './common';

const ES_RESOURCES_DIR = resolve(
  REPO_ROOT,
  'x-pack/solutions/security/plugins/security_solution/scripts/endpoint/common/roles_users/serverless/es_serverless_resources'
);

export const ES_RESOURCES = Object.freeze({
  roles: join(ES_RESOURCES_DIR, 'roles.yml'),
  users: join(ES_RESOURCES_DIR, 'users'),
  users_roles: join(ES_RESOURCES_DIR, 'users_roles'),
});

export const resolveCloudUsersFilePath = (filename: string) => resolve(REPO_ROOT, '.ftr', filename);

export const ES_LOADED_USERS = readFileSync(ES_RESOURCES.users)
  .toString()
  .split(/\n/)
  .filter((v) => !!v) // Ensure no empty strings
  .map((userAndPasswordString) => {
    return userAndPasswordString.split(':').at(0);
  });

export const samlAuthentication = async (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<void> => {
  const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

  const kbnHost = config.env.KIBANA_URL || config.env.BASE_URL;

  const kbnUrl = new URL(kbnHost);

  const hostOptions: HostOptions = {
    protocol: kbnUrl.protocol as 'http' | 'https',
    hostname: kbnUrl.hostname,
    port: parseInt(kbnUrl.port, 10),
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
  };

  on('task', {
    getSessionCookie: async (
      role: string | SecurityRoleName
    ): Promise<{ cookie: string; username: string; password: string }> => {
      // If config.env.PROXY_ORG is set, it means that proxy service is used to create projects. Define the proxy org filename to override the roles.
      const rolesFilename = config.env.PROXY_ORG
        ? `${config.env.PROXY_ORG}.json`
        : 'role_users.json';
      const sessionManager = new SamlSessionManager({
        hostOptions,
        log,
        isCloud: config.env.CLOUD_SERVERLESS,
        cloudUsersFilePath: resolveCloudUsersFilePath(rolesFilename),
      });
      return sessionManager.getInteractiveUserSessionCookieWithRoleScope(role).then((cookie) => {
        return {
          cookie,
          username: hostOptions.username,
          password: hostOptions.password,
        };
      });
    },
  });
};
