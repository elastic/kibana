/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { spawn } from 'child_process';
import Path from 'path';

const PRE_BUILD_SCRIPT = Path.resolve(__dirname, '../../lifecycle/pre_build.sh');
/** Execute pre_build.sh and silence its output */
export async function runPreBuild() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(PRE_BUILD_SCRIPT, {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: process.env,
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pre_build.sh exited with code ${code ?? 'null'}`));
    });
  });
}
