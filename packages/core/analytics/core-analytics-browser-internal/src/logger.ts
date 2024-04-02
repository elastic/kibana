/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import { unsafeConsole } from '@kbn/security-hardening';

/**
 * Create custom logger until we have a proper logging solution: https://github.com/elastic/kibana/issues/33796
 * @param isDev Is Kibana running in Dev Mode?
 */
export function createLogger(isDev: boolean): Logger {
  // TODO: Replace with a core logger once we implement it in https://github.com/elastic/kibana/issues/33796
  // For now, it logs only in dev mode
  const logger: Logger = {
    // eslint-disable-next-line @kbn/eslint/no_unsafe_console
    fatal: (...args) => (isDev ? unsafeConsole.error(...args) : void 0),
    // eslint-disable-next-line @kbn/eslint/no_unsafe_console
    error: (...args) => (isDev ? unsafeConsole.error(...args) : void 0),
    // eslint-disable-next-line @kbn/eslint/no_unsafe_console
    warn: (...args) => (isDev ? unsafeConsole.warn(...args) : void 0),
    // eslint-disable-next-line @kbn/eslint/no_unsafe_console
    info: (...args) => (isDev ? unsafeConsole.info(...args) : void 0),
    // eslint-disable-next-line @kbn/eslint/no_unsafe_console
    debug: (...args) => (isDev ? unsafeConsole.debug(...args) : void 0),
    // eslint-disable-next-line @kbn/eslint/no_unsafe_console
    trace: (...args) => (isDev ? unsafeConsole.trace(...args) : void 0),
    // eslint-disable-next-line @kbn/eslint/no_unsafe_console
    log: (...args) => (isDev ? unsafeConsole.log(...args) : void 0),
    isLevelEnabled: () => true,
    get: () => logger,
  };

  return logger;
}
