/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { spawn } from 'child_process';

export async function exec(shellCommand: string, env?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const [command, ...params] = shellCommand.split(/\s+/);
    const childProcess = spawn(command, params, { env: { ...process.env, ...env } });
    childProcess.on('close', (code) => {
      if (code) {
        reject(Buffer.concat(errChunks).toString());
      } else {
        resolve(Buffer.concat(outChunks).toString());
      }
    });
    childProcess.on('error', (err) => reject(err));
    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    childProcess.stdout.on('data', outChunks.push.bind(outChunks));
    childProcess.stderr.on('data', errChunks.push.bind(errChunks));
  });
}
