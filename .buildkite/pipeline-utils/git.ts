/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { getKibanaDir } from './get_kibana_dir.ts';

export const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;

/** Runs git in the Kibana checkout and returns trimmed stdout; throws on a non-zero exit. */
export const git = (args: string[]): string =>
  execFileSync('git', args, {
    cwd: getKibanaDir(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
