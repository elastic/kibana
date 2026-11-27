/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import getopts from 'getopts';

export const formatCurrentDate = () => {
  const now = new Date();

  const format = (num: number, length: number) => String(num).padStart(length, '0');

  return (
    `${format(now.getDate(), 2)}/${format(now.getMonth() + 1, 2)}/${now.getFullYear()} ` +
    `${format(now.getHours(), 2)}:${format(now.getMinutes(), 2)}:${format(now.getSeconds(), 2)}.` +
    `${format(now.getMilliseconds(), 3)}`
  );
};

/** Port from `envVar` (or `defaultPort` when unset); throws unless it is an integer from 1 to 65535. */
export const getPortFromEnv = (envVar: string, defaultPort: number): number => {
  const value = process.env[envVar];
  if (!value) return defaultPort;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`process.env.${envVar} must contain a valid port. given: ${value}`);
  }
  return port;
};

export const getOrganizationId = (kbnServerArgs: string[]) => {
  return getopts(kbnServerArgs)['xpack.cloud.organization_id'] as string | undefined;
};
