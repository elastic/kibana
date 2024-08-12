/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Config, createEsClientForFtrConfig } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { MOCK_IDP_REALM_NAME } from '@kbn/mock-idp-utils';
import { ServerlessAuthProvider } from './serverless/auth_provider';
import { StatefulAuthProvider } from './stateful/auth_provider';
import { createRole, createRoleMapping } from './stateful/create_role_mapping';

export interface AuthProvider {
  getSupportedRoleDescriptors(): Record<string, unknown>;
  getDefaultRole(): string;
  getRolesDefinitionPath(): string;
  getCommonRequestHeader(): { [key: string]: string };
  getInternalRequestHeader(): { [key: string]: string };
}

export interface AuthProviderProps {
  config: Config;
  log: ToolingLog;
}

export const getAuthProvider = async (props: AuthProviderProps) => {
  const { config, log } = props;
  const isServerless = !!props.config.get('serverless');
  if (isServerless) {
    return new ServerlessAuthProvider(config);
  }

  const provider = new StatefulAuthProvider();
  // TODO: Move it to @kbn-es package, so that roles and its mapping are created before FTR services loading starts.
  // 'viewer' and 'editor' roles are available by default, but we have to create 'admin' role
  const esClient = createEsClientForFtrConfig(config);
  const adminRoleMapping = {
    name: 'admin',
    applications: [
      {
        application: '*',
        privileges: ['*'],
        resources: ['*'],
      },
    ],
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
        allow_restricted_indices: false,
      },
      {
        names: ['*'],
        privileges: ['monitor', 'read', 'read_cross_cluster', 'view_index_metadata'],
        allow_restricted_indices: true,
      },
    ],
    run_as: ['*'],
  };

  await createRole({ roleMapping: adminRoleMapping, esClient, log });
  const roles = Object.keys(provider.getSupportedRoleDescriptors());
  // Creating roles mapping for mock-idp
  await createRoleMapping({ name: MOCK_IDP_REALM_NAME, roles, esClient, log });
  return provider;
};
