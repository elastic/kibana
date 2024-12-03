/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { CliSupportedServerModes } from '../types';

export const getConfigFilePath = (config: CliSupportedServerModes): string => {
  if (config === 'stateful') {
    return path.join(__dirname, 'stateful', 'stateful.config.ts');
  }

  const [mode, type] = config.split('=');
  if (mode !== 'serverless' || !type) {
    throw new Error(
      `Invalid config format: ${config}. Expected "stateful" or "serverless=<type>".`
    );
  }

  return path.join(__dirname, 'serverless', `${type}.serverless.config.ts`);
};
