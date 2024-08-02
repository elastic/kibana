/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Config, createEsClientForFtrConfig } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { KibanaServer } from '../../..';

export async function createRole({
  roleName,
  roleMapping,
  kibanaServer,
  log,
}: {
  roleName: string;
  roleMapping: any;
  kibanaServer: KibanaServer;
  log: ToolingLog;
}) {
  log.debug(`Adding a SAML role: ${roleName}`);
  const { status, statusText } = await kibanaServer.request({
    path: `/api/security/role/${roleName}`,
    method: 'PUT',
    body: roleMapping,
    retries: 0,
  });
  if (status !== 204) {
    throw new Error(`Expected status code of 204, received ${status} ${statusText}`);
  }
}

export async function createRoleMapping({
  name,
  roles,
  config,
  log,
}: {
  name: string;
  roles: string[];
  config: Config;
  log: ToolingLog;
}) {
  log.debug(`Creating a role mapping: {realm.name: ${name}, roles: ${roles}}`);
  const esClient = createEsClientForFtrConfig(config);
  await esClient.security.putRoleMapping({
    name,
    roles,
    enabled: true,
    // @ts-ignore
    rules: { field: { 'realm.name': name } },
  });
}
