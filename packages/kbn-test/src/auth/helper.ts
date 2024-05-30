/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as fs from 'fs';
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

export const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
};

export const isValidHostname = (value: string) => {
  if (value.length === 0) {
    return false;
  }

  const validChars = /^[a-zA-Z0-9-.]{1,253}\.?$/g;
  if (!validChars.test(value)) {
    return false;
  }

  if (value.endsWith('.')) {
    value = value.slice(0, value.length - 1);
  }

  if (value.length > 253) {
    return false;
  }

  return true;
};
