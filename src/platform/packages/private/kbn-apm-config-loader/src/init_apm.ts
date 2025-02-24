/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadConfiguration } from './config_loader';

export const initApm = (
  argv: string[],
  rootDir: string,
  isDistributable: boolean,
  serviceName: string
) => {
  const apmConfigLoader = loadConfiguration(argv, rootDir, isDistributable);
  const apmConfig = apmConfigLoader.getConfig(serviceName);
  const shouldRedactUsers = apmConfigLoader.isUsersRedactionEnabled();

  // we want to only load the module when effectively used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const apm = require('elastic-apm-node');

  // Filter out all user PII
  if (shouldRedactUsers) {
    apm.addFilter((payload: Record<string, any>) => {
      try {
        if (payload.context?.user && typeof payload.context.user === 'object') {
          Object.keys(payload.context.user).forEach((key) => {
            payload.context.user[key] = '[REDACTED]';
          });
        }
      } catch (e) {
        // just silently ignore the error
      }
      return payload;
    });
  }

  apm.start(apmConfig);
};
