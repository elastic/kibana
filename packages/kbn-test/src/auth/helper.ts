/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import * as fs from 'fs';
import { resolve } from 'path';
import { User } from './session_manager';

export const getProjectType = (serverArgs: string[]) => {
  const svlArg = serverArgs.filter((arg) => arg.startsWith('--serverless'));
  if (svlArg.length === 0) {
    throw new Error('--serverless argument is missing in kbnTestServer.serverArgs');
  }
  return svlArg[0].split('=')[1];
};

/**
 * Loads cloud users from '.ftr/role_users.json'
 * QAF prepares the file for CI pipelines, make sure to add it manually for local run
 */
export const readCloudUsersFromFile = (): Array<[string, User]> => {
  const cloudRoleUsersFilePath = resolve(REPO_ROOT, '.ftr', 'role_users.json');
  if (!fs.existsSync(cloudRoleUsersFilePath)) {
    throw new Error(`Please define user roles with email/password in ${cloudRoleUsersFilePath}`);
  }
  const data = fs.readFileSync(cloudRoleUsersFilePath, 'utf8');
  if (data.length === 0) {
    throw new Error(`'${cloudRoleUsersFilePath}' is empty: no roles are defined`);
  }

  return Object.entries(JSON.parse(data)) as Array<[string, User]>;
};
