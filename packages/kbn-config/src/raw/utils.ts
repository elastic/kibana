/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
