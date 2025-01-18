/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GlobalTask } from '../lib';

export const VerifyEnv: GlobalTask = {
  global: true,
  description: 'Verifying environment meets requirements',

  async run(config, log) {
    const version = `v${config.getNodeVersion()}`;

    if (version !== process.version) {
      throw new Error(`Invalid nodejs version, please use ${version}`);
    }

    log.success('Node.js version verified');
  },
};
