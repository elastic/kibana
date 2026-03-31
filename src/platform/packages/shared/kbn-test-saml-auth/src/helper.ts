/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import { Role, User } from './types';

export const readCloudUsersFromFile = (filePath: string): Array<[Role, User]> => {
  const defaultMessage = `Cannot read roles and email/password from ${filePath}`;
  if (!fs.existsSync(filePath)) {
    throw new Error(`${defaultMessage}: file does not exist`);
  }
  const data = fs.readFileSync(filePath, 'utf8');
  if (data.length === 0) {
    throw new Error(`${defaultMessage}: file is empty`);
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
