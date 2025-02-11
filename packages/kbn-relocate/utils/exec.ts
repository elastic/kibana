/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import util from 'util';
import { exec } from 'child_process';

export const execAsync = util.promisify(exec);

export const safeExec = async (command: string, critical = true, log = true) => {
  try {
    if (log) {
      // eslint-disable-next-line no-console
      console.log(' >', command);
    }
    const result = await execAsync(command, { maxBuffer: 1024 * 1024 * 128 });
    return result;
  } catch (err) {
    const message = `Error executing ${command}: ${err}`;

    if (critical) {
      throw err;
    }
    return { stdout: '', stderr: message };
  }
};

export const quietExec = async (command: string) => {
  return await safeExec(command, false, false);
};
