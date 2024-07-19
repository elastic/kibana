/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Config } from '@kbn/test';
import { ServerlessRoleProvider } from './serverless_role_provider';
import { StatefulRoleProvider } from './stateful_role_provider';

export interface RoleProvider {
  getSupportedRoleDescriptors(): any;
  getDefaultRole(): string;
}

export const getRoleProvider = (config: Config) => {
  const isServerless = !!config.get('serverless');
  return isServerless ? new ServerlessRoleProvider(config) : new StatefulRoleProvider();
};
