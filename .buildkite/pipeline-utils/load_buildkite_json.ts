/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const getKibanaDir = (() => {
  let kibanaDir: string | undefined;

  return (): string => {
    kibanaDir ??= execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim();

    return kibanaDir;
  };
})();

export const loadBuildkiteJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(resolve(getKibanaDir(), '.buildkite', relativePath), 'utf8')) as T;
