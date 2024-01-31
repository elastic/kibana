/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import { kibanaConsole } from '@kbn/security-hardening';

/**
 * Create custom logger until we have a proper logging solution: https://github.com/elastic/kibana/issues/33796
 * @param isDev Is Kibana running in Dev Mode?
 */
export function createLogger(isDev: boolean): Logger {
  // TODO: Replace with a core logger once we implement it in https://github.com/elastic/kibana/issues/33796
  // For now, it logs only in dev mode
  const logger: Logger = {
    fatal: (...args) => (isDev ? kibanaConsole.error(...args) : void 0),
    error: (...args) => (isDev ? kibanaConsole.error(...args) : void 0),
    warn: (...args) => (isDev ? kibanaConsole.warn(...args) : void 0),
    info: (...args) => (isDev ? kibanaConsole.info(...args) : void 0),
    debug: (...args) => (isDev ? kibanaConsole.debug(...args) : void 0),
    trace: (...args) => (isDev ? kibanaConsole.trace(...args) : void 0),
    log: (...args) => (isDev ? kibanaConsole.log(...args) : void 0),
    isLevelEnabled: () => true,
    get: () => logger,
  };

  return logger;
}
