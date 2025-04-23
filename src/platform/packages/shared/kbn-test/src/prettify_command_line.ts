/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import * as path from 'path';

const kibanaRoot = execSync('git rev-parse --show-toplevel').toString().trim() || process.cwd();

export function prettifyCommandLine(args: string[]) {
  let [executable, ...rest] = args;
  if (executable.endsWith('node')) {
    executable = 'node';
  }
  rest = rest.map((arg) => path.relative(kibanaRoot, arg));

  return [executable, ...rest].join(' ');
}
