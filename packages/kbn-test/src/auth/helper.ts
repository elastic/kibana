/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as fs from 'fs';
import { resolve } from 'path';
import { load as loadYaml } from 'js-yaml';
import {
  ServerlessProjectType,
  SERVERLESS_ROLES_ROOT_PATH,
  VALID_SERVERLESS_PROJECT_TYPE,
} from '@kbn/es';
import { Role, User } from './types';

export const readCloudUsersFromFile = (filePath: string): Array<[Role, User]> => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Please define user roles with email/password in ${filePath}`);
  }
  const data = fs.readFileSync(filePath, 'utf8');
  if (data.length === 0) {
    throw new Error(`'${filePath}' is empty: no roles are defined`);
  }

  return Object.entries(JSON.parse(data)) as Array<[Role, User]>;
};

export const readSvlRolesFromResources = (projectType: ServerlessProjectType | undefined) => {
  const resourcePaths = projectType
    ? [resolve(SERVERLESS_ROLES_ROOT_PATH, projectType, 'roles.yml')]
    : // read roles for all projects if project is not defined
      VALID_SERVERLESS_PROJECT_TYPE.map((type) =>
        resolve(SERVERLESS_ROLES_ROOT_PATH, type, 'roles.yml')
      );

  return resourcePaths
    .map((path) => {
      const data = loadYaml(fs.readFileSync(path, 'utf8'));
      if (typeof data === 'object' && data !== null) {
        return Object.keys(data);
      } else {
        throw new Error(`expected ${path} file to parse to an object`);
      }
    })
    .reduce((arr1, arr2) => [...new Set(arr1.concat(arr2))]);
};
