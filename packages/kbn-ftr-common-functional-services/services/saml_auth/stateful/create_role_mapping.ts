/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Client } from '@elastic/elasticsearch';
import { SecurityPutRoleRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ToolingLog } from '@kbn/tooling-log';

export interface CreateRoleProps {
  roleMapping: SecurityPutRoleRequest;
  esClient: Client;
  log: ToolingLog;
}

export interface CreateRoleMappingProps {
  name: string;
  roles: string[];
  esClient: Client;
  log: ToolingLog;
}

export async function createRole(props: CreateRoleProps) {
  const { roleMapping, esClient, log } = props;
  log.debug(`Adding a role: ${roleMapping.name}`);
  const response = await esClient.security.putRole(roleMapping);
  log.debug(response.role.created ? 'Role successfully created' : 'Role was not created');
}

export async function createRoleMapping(props: CreateRoleMappingProps) {
  const { name, roles, esClient, log } = props;
  log.debug(`Creating a role mapping: {realm.name: ${name}, roles: ${roles}}`);
  const response = await esClient.security.putRoleMapping({
    name,
    roles,
    enabled: true,
    // @ts-expect-error `realm.name` is not defined as the supported field
    rules: { field: { 'realm.name': name } },
  });
  log.debug(
    response.role_mapping.created
      ? 'Role mapping successfully created'
      : 'Role mapping was not created'
  );
}
