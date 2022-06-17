/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';

/**
 * Create custom logger until we have a proper logging solution: https://github.com/elastic/kibana/issues/33796
 * @param isDev Is Kibana running in Dev Mode?
 */
export function createLogger(isDev: boolean): Logger {
  // TODO: Replace with a core logger once we implement it in https://github.com/elastic/kibana/issues/33796
  // For now, it logs only in dev mode
  const logger: Logger = {
    // eslint-disable-next-line no-console
    fatal: (...args) => (isDev ? console.error(...args) : void 0),
    // eslint-disable-next-line no-console
    error: (...args) => (isDev ? console.error(...args) : void 0),
    // eslint-disable-next-line no-console
    warn: (...args) => (isDev ? console.warn(...args) : void 0),
    // eslint-disable-next-line no-console
    info: (...args) => (isDev ? console.info(...args) : void 0),
    // eslint-disable-next-line no-console
    debug: (...args) => (isDev ? console.debug(...args) : void 0),
    // eslint-disable-next-line no-console
    trace: (...args) => (isDev ? console.trace(...args) : void 0),
    // eslint-disable-next-line no-console
    log: (...args) => (isDev ? console.log(...args) : void 0),
    get: () => logger,
  };

  return logger;
}
