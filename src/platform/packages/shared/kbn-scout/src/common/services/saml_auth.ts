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
import type { HostOptions } from '@kbn/test';
import { SamlSessionManager } from '@kbn/test';
import type { ScoutTestConfig } from '../../types';
import type { Protocol } from '../../playwright/types';
import type { ScoutLogger } from './logger';

// TODO: Add support for serverless projects with different tiers
// ref https://github.com/elastic/kibana/pull/229919
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
  log: ScoutLogger,
  customRoleName?: string
) => {
  const resourceDirPath = getResourceDirPath(config);
  const rolesDefinitionPath = path.resolve(resourceDirPath, 'roles.yml');

  const supportedRoleDescriptors = readRolesDescriptorsFromResource(rolesDefinitionPath) as Record<
    string,
    unknown
  >;

  const supportedRoles = [...Object.keys(supportedRoleDescriptors)].concat(customRoleName || []);

  const sessionManager = new SamlSessionManager({
    hostOptions: createKibanaHostOptions(config),
    log,
    isCloud: config.isCloud,
    cloudHostName: config.cloudHostName,
    supportedRoles: {
      roles: supportedRoles,
      sourcePath: rolesDefinitionPath,
    },
    cloudUsersFilePath: config.cloudUsersFilePath,
    serverless: config.projectType
      ? {
          uiam: config.uiam,
          projectType: config.projectType,
          organizationId: config.organizationId!,
        }
      : undefined,
  });

  log.serviceLoaded('samlAuth');

  return sessionManager;
};
