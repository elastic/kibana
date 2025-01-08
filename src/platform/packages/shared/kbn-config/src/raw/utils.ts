/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const splitKey = (rawKey: string): string[] => {
  if (rawKey.startsWith('[') && rawKey.endsWith(']')) {
    return [rawKey.substring(1, rawKey.length - 1)];
  }
  return rawKey.split('.');
};

export const getUnsplittableKey = (rawKey: string): string | undefined => {
  if (rawKey.startsWith('[') && rawKey.endsWith(']')) {
    return rawKey.substring(1, rawKey.length - 1);
  }
  return undefined;
};

export function replaceEnvVarRefs(
  val: string,
  env: {
    [key: string]: string | undefined;
  } = process.env
) {
  return val.replace(/\$\{(\w+)(:(\w+))?\}/g, (match, ...groups) => {
    const envVarName = groups[0];
    const defaultValue = groups[2];

    const envVarValue = env[envVarName];
    if (envVarValue !== undefined) {
      return envVarValue;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Unknown environment variable referenced in config : ${envVarName}`);
  });
}
