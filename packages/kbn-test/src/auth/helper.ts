/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as fs from 'fs';
import { extname } from 'path';
import { load as loadYaml } from 'js-yaml';
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

export const readRolesFromResource = (resourcePath: string) => {
  if (!fs.existsSync(resourcePath) || extname(resourcePath) !== '.yml') {
    throw new Error(`${resourcePath} does not exist or not a yml file`);
  }
  const data = loadYaml(fs.readFileSync(resourcePath, 'utf8'));
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data);
  } else {
    throw new Error(`expected ${resourcePath} file to parse to an object`);
  }
};
