/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Config } from '@kbn/test';
import { ServerlessAuthRoleProvider } from './serverless_role_provider';
import { StatefuAuthRoleProvider } from './stateful_role_provider';

export interface AuthRoleProvider {
  getSupportedRoleDescriptors(): any;
  getDefaultRole(): string;
  getRolesDefinitionPath(): string;
}

export const getAuthRoleProvider = (config: Config) => {
  const isServerless = !!config.get('serverless');
  return isServerless ? new ServerlessAuthRoleProvider(config) : new StatefuAuthRoleProvider();
};
