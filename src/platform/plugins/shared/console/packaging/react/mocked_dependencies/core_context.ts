/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const createLogger = (name?: string): any => ({
  debug: (...args: any[]) => console.debug(`[DEBUG]${name ? ` [${name}]` : ''}`, ...args),
  info: (...args: any[]) => console.info(`[INFO]${name ? ` [${name}]` : ''}`, ...args),
  warn: (...args: any[]) => console.warn(`[WARN]${name ? ` [${name}]` : ''}`, ...args),
  error: (...args: any[]) => console.error(`[ERROR]${name ? ` [${name}]` : ''}`, ...args),
  trace: (...args: any[]) => console.trace(`[TRACE]${name ? ` [${name}]` : ''}`, ...args),
  fatal: (...args: any[]) => console.error(`[FATAL]${name ? ` [${name}]` : ''}`, ...args),
  log: (...args: any[]) => console.log(`[LOG]${name ? ` [${name}]` : ''}`, ...args),
  get: (childName?: string) => createLogger(name ? `${name}.${childName}` : childName),
});

export const coreContext = {
  coreId: Symbol('core'),
  logger: {
    get: (...contextParts: string[]) => {
      const contextName = contextParts.join('.');
      return createLogger(contextName);
    },
  },
  env: {
    packageInfo: {
      version: '1.0.0',
      branch: 'main',
      buildNum: 1,
      buildSha: 'dev-build',
      buildShaShort: 'dev',
      buildDate: new Date(),
      buildFlavor: 'traditional' as const,
      dist: false,
    },
    mode: {
      name: 'development' as const,
      dev: true,
      prod: false,
    },
  },
};
