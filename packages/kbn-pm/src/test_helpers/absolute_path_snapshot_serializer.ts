/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeepWith } from 'lodash';
import { resolve, sep as pathSep } from 'path';

const repoRoot = resolve(__dirname, '../../../../');

const normalizePaths = (value: any) => {
  let didReplacement = false;
  const clone = cloneDeepWith(value, (v: any) => {
    if (typeof v === 'string' && v.startsWith(repoRoot)) {
      didReplacement = true;
      return v
        .replace(repoRoot, '<repoRoot>')
        .split(pathSep) // normalize path separators
        .join('/');
    }
  });

  return {
    clone,
    didReplacement,
  };
};

export const absolutePathSnapshotSerializer = {
  print(value: any, serialize: (val: any) => string) {
    return serialize(normalizePaths(value).clone);
  },

  test(value: any) {
    return normalizePaths(value).didReplacement;
  },
};
