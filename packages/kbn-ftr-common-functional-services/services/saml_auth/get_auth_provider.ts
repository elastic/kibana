/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Config } from '@kbn/test';
import { ServerlessAuthProvider } from './serverless/auth_provider';
import { StatefulAuthProvider } from './stateful/auth_provider';

export interface AuthProvider {
  getSupportedRoleDescriptors(): Record<string, unknown>;
  getDefaultRole(): string;
  getRolesDefinitionPath(): string;
  getCommonRequestHeader(): { [key: string]: string };
  getInternalRequestHeader(): { [key: string]: string };
}

export interface AuthProviderProps {
  config: Config;
}

export const getAuthProvider = (props: AuthProviderProps) => {
  const { config } = props;
  const isServerless = !!props.config.get('serverless');
  return isServerless ? new ServerlessAuthProvider(config) : new StatefulAuthProvider();
};
