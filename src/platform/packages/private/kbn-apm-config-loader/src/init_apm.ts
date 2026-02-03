/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { loadConfiguration } from './config_loader';
import { piiFilter } from './filters/pii_filter';
import { patchMocha } from './patch_mocha';

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
  const apm = require('elastic-apm-node') as typeof import('elastic-apm-node');

  // Filter out all user PII
  if (shouldRedactUsers) {
    apm.addFilter(piiFilter);
  }

  // for FTR runs:
  // - instrument Mocha
  // - filter out webdriver HTTP calls that are high in volume and low value
  if (serviceName.includes('functional')) {
    patchMocha(apm);
    apm.addFilter((event) => {
      const url = event.context?.http?.url;

      if (!url) {
        return event;
      }

      const parsed = new URL(url);

      if (parsed.hostname === '127.0.0.1' && parsed.pathname.startsWith('/session')) {
        return false;
      }

      return event;
    });
  }

  apm.start(apmConfig);
};
