/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { URL } from 'url';
import {
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
  readRolesDescriptorsFromResource,
} from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { HostOptions, SamlSessionManager } from '@kbn/test';
import { ScoutTestConfig } from '../../types';
import { Protocol } from '../../playwright/types';
import { ScoutLogger } from './logger';

const getResourceDirPath = (config: ScoutTestConfig) => {
  return config.serverless
    ? path.resolve(SERVERLESS_ROLES_ROOT_PATH, config.projectType!)
    : path.resolve(REPO_ROOT, STATEFUL_ROLES_ROOT_PATH);
};

const createKibanaHostOptions = (config: ScoutTestConfig): HostOptions => {
  const kibanaUrl = new URL(config.hosts.kibana);
  kibanaUrl.username = config.auth.username;
  kibanaUrl.password = config.auth.password;

  return {
    protocol: kibanaUrl.protocol.replace(':', '') as Protocol,
    hostname: kibanaUrl.hostname,
    port: Number(kibanaUrl.port),
    username: kibanaUrl.username,
    password: kibanaUrl.password,
  };
};

export const createSamlSessionManager = (
  config: ScoutTestConfig,
  log: ScoutLogger
): SamlSessionManager => {
  const resourceDirPath = getResourceDirPath(config);
  const rolesDefinitionPath = path.resolve(resourceDirPath, 'roles.yml');

  const supportedRoleDescriptors = readRolesDescriptorsFromResource(rolesDefinitionPath) as Record<
    string,
    unknown
  >;
  const supportedRoles = Object.keys(supportedRoleDescriptors);

  const sessionManager = new SamlSessionManager({
    hostOptions: createKibanaHostOptions(config),
    log,
    isCloud: config.isCloud,
    supportedRoles: {
      roles: supportedRoles,
      sourcePath: rolesDefinitionPath,
    },
    cloudUsersFilePath: config.cloudUsersFilePath,
  });

  log.serviceLoaded('samlAuth');

  return sessionManager;
};
