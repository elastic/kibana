/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { type Config } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { MOCK_IDP_REALM_NAME } from '@kbn/mock-idp-utils';
import { KibanaServer } from '../..';

import { ServerlessAuthProvider } from './serverless/auth_provider';
import { StatefulAuthProvider } from './stateful/auth_provider';
import { createRole, createRoleMapping } from './stateful/create_role_mapping';

const STATEFUL_ADMIN_ROLE_MAPPING_PATH = './stateful/admin_mapping';

export interface AuthProvider {
  getSupportedRoleDescriptors(): any;
  getDefaultRole(): string;
  getRolesDefinitionPath(): string;
  getCommonRequestHeader(): { [key: string]: string };
  getInternalRequestHeader(): { [key: string]: string };
}

export interface AuthProviderProps {
  config: Config;
  kibanaServer: KibanaServer;
  log: ToolingLog;
}

export const getAuthProvider = async (props: AuthProviderProps) => {
  const { config, log, kibanaServer } = props;
  const isServerless = !!props.config.get('serverless');
  if (isServerless) {
    return new ServerlessAuthProvider(config);
  }

  const provider = new StatefulAuthProvider();
  // TODO: Move it to @kbn-es package, so that roles and its mapping are created before FTR services loading starts.
  // 'viewer' and 'editor' roles are available by default, but we have to create 'admin' role
  const adminRoleMapping = JSON.parse(
    fs.readFileSync(require.resolve(STATEFUL_ADMIN_ROLE_MAPPING_PATH), 'utf8')
  );
  await createRole({ roleName: 'admin', roleMapping: adminRoleMapping, kibanaServer, log });
  const roles = Object.keys(provider.getSupportedRoleDescriptors());
  // Creating roles mapping for mock-idp
  await createRoleMapping({ name: MOCK_IDP_REALM_NAME, roles, config, log });
  return provider;
};
