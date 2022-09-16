/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { Flags } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';

const makeAbsolute = (path: string) => Path.resolve(path);

function iter(flags: Flags, key: string) {
  const value = flags[key] || undefined;
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(makeAbsolute);
  }

  if (typeof value === 'string') {
    return [makeAbsolute(value)];
  }

  throw createFlagError(`--${key} must be a string`);
}

export function parseConfigPaths(flags: Flags): string[] {
  return [...iter(flags, 'config'), ...iter(flags, 'journey')];
}
