/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import {
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
  readRolesDescriptorsFromResource,
} from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { SamlSessionManager } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { ScoutServerConfig } from '../../types';
import { Protocol } from '../../playwright/types';
import { serviceLoadedMsg } from '../../playwright/utils';

export const createSamlSessionManager = (config: ScoutServerConfig, log: ToolingLog) => {
  const kibanaUrl = new URL(config.hosts.kibana);
  kibanaUrl.username = config.auth.username;
  kibanaUrl.password = config.auth.password;

  const resourceDirPath = path.resolve(
    ...(config.serverless
      ? [SERVERLESS_ROLES_ROOT_PATH, config.projectType!]
      : [REPO_ROOT, STATEFUL_ROLES_ROOT_PATH])
  );
  const rolesDefinitionPath = path.resolve(resourceDirPath, 'roles.yml');

  const supportedRoleDescriptors = readRolesDescriptorsFromResource(rolesDefinitionPath) as Record<
    string,
    unknown
  >;
  const supportedRoles = Object.keys(supportedRoleDescriptors);

  const sessionManager = new SamlSessionManager({
    hostOptions: {
      protocol: kibanaUrl.protocol.replace(':', '') as Protocol,
      hostname: kibanaUrl.hostname,
      port: Number(kibanaUrl.port),
      username: kibanaUrl.username,
      password: kibanaUrl.password,
    },
    log,
    isCloud: config.isCloud,
    supportedRoles: {
      roles: supportedRoles,
      sourcePath: rolesDefinitionPath,
    },
    cloudUsersFilePath: config.cloudUsersFilePath,
  });

  log.debug(serviceLoadedMsg('samlAuth'));

  return sessionManager;
};
