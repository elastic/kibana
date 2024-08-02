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
import { KibanaServer } from '../..';

import { ServerlessAuthProvider } from './serverless/auth_provider';
import { StatefulAuthProvider } from './stateful/auth_provider';
import { createRole, createRoleMapping } from './stateful/create_role_mapping';

const STATEFUL_ADMIN_ROLE_MAPPING_PATH = './stateful/admin_mapping';
const MOCK_IDP_REALM_NAME = 'cloud-saml-kibana';

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

export const getAuthRoleProvider = async (props: AuthProviderProps) => {
  const { config, log, kibanaServer } = props;
  const isServerless = !!props.config.get('serverless');
  if (isServerless) {
    return new ServerlessAuthProvider(config);
  } else {
    const provider = new StatefulAuthProvider();

    // TODO: move admin role & roles mapping creation to @kbn-es
    // 'viewer' and 'editor' roles are already pre-exist for stateful ES, but we have to add 'admin'
    const adminRoleMapping = JSON.parse(
      fs.readFileSync(require.resolve(STATEFUL_ADMIN_ROLE_MAPPING_PATH), 'utf8')
    );
    await createRole({ roleName: 'admin', roleMapping: adminRoleMapping, kibanaServer, log });
    const roles = Object.keys(provider.getSupportedRoleDescriptors());
    // Creating roles mapping for mock-idp
    await createRoleMapping({ name: MOCK_IDP_REALM_NAME, roles, config, log });
    return provider;
  }
};
