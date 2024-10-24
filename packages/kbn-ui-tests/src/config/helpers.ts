/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import * as Fs from 'fs';
import { ServerlessProjectType } from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { TestServersConfig } from './types';

export const formatCurrentDate = () => {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

export const getProjectType = (serverArgs: string[]) => {
  const kbnServerArgs = serverArgs as string[];
  return kbnServerArgs.reduce((acc, arg) => {
    const match = arg.match(/--serverless[=\s](\w+)/);
    return acc + (match ? match[1] : '');
  }, '') as ServerlessProjectType;
};

export const saveTestServersConfigOnDisk = (testServersConfig: TestServersConfig) => {
  const jsonData = JSON.stringify(testServersConfig, null, 2);
  // create temp directory to store test servers confugration
  const tempDirPath = Path.join(REPO_ROOT, '.test_servers');
  if (!Fs.existsSync(tempDirPath)) {
    Fs.mkdirSync(tempDirPath);
  }

  const serversConfigPath = Path.join(tempDirPath, `local.json`);
  // saving file with local servers configuration
  Fs.writeFileSync(serversConfigPath, jsonData, 'utf-8');

  return serversConfigPath;
};
