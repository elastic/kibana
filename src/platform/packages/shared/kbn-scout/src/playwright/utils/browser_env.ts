/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const PROXY_ENV_VARS: readonly string[] = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
];

/** Returns the browser's environment without proxy variables on Citadel builds, `undefined` otherwise. */
export const getBrowserEnvWithoutProxy = (): Record<string, string> | undefined => {
  if (process.env.USE_CITADEL_PROXY !== 'true') {
    return undefined;
  }

  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined && !PROXY_ENV_VARS.includes(name)) {
      env[name] = value;
    }
  }
  return env;
};
