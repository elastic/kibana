/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-browser-internal';

export interface CoreContextOptions {
  version?: string;
  branch?: string;
  buildNum?: number;
  buildSha?: string;
  buildShaShort?: string;
  buildDate?: Date;
  mode?: 'development' | 'production';
  enableConsoleLogging?: boolean;
}

/* eslint-disable no-console */
/**
 * Creates a logger that logs to the browser console.
 * Only enabled when enableConsoleLogging is true.
 */
const createLogger = (name?: string, enabled: boolean = true): any => {
  if (!enabled) {
    return {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      trace: () => {},
      fatal: () => {},
      log: () => {},
      get: () => createLogger(undefined, false),
    };
  }

  return {
    debug: (...args: any[]) => console.debug(`[DEBUG]${name ? ` [${name}]` : ''}`, ...args),
    info: (...args: any[]) => console.info(`[INFO]${name ? ` [${name}]` : ''}`, ...args),
    warn: (...args: any[]) => console.warn(`[WARN]${name ? ` [${name}]` : ''}`, ...args),
    error: (...args: any[]) => console.error(`[ERROR]${name ? ` [${name}]` : ''}`, ...args),
    trace: (...args: any[]) => console.trace(`[TRACE]${name ? ` [${name}]` : ''}`, ...args),
    fatal: (...args: any[]) => console.error(`[FATAL]${name ? ` [${name}]` : ''}`, ...args),
    log: (...args: any[]) => console.log(`[LOG]${name ? ` [${name}]` : ''}`, ...args),
    get: (childName?: string) => createLogger(name ? `${name}.${childName}` : childName, enabled),
  };
};
/* eslint-enable no-console */

/**
 * Creates a CoreContext for standalone packaging.
 * This provides logging and environment information for Kibana core services.
 *
 * @param options - Configuration options to customize the core context
 * @returns A CoreContext implementation for standalone use
 *
 * @example
 * ```ts
 * const coreContext = createCoreContext({
 *   version: '8.12.0',
 *   mode: 'production',
 *   enableConsoleLogging: false,
 * });
 * ```
 */
export function createCoreContext(options: CoreContextOptions = {}): CoreContext {
  const {
    version = '1.0.0',
    branch = 'main',
    buildNum = 1,
    buildSha = 'dev-build',
    buildShaShort = 'dev',
    buildDate = new Date(),
    mode = 'development',
    enableConsoleLogging = true,
  } = options;

  const isDev = mode === 'development';

  return {
    coreId: Symbol('core'),
    logger: {
      get: (...contextParts: string[]) => {
        const contextName = contextParts.join('.');
        return createLogger(contextName, enableConsoleLogging);
      },
    },
    env: {
      packageInfo: {
        version,
        branch,
        buildNum,
        buildSha,
        buildShaShort,
        buildDate,
        buildFlavor: 'traditional' as const,
        dist: !isDev,
      },
      mode: {
        name: mode,
        dev: isDev,
        prod: !isDev,
      },
      airgapped: false,
    },
  } as CoreContext;
}
