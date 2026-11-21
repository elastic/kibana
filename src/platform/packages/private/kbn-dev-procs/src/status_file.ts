/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { SupervisorStatus } from './types';

/** Writes the status atomically, so a reader never sees a half-written file. */
export const writeStatusFile = (file: string, status: SupervisorStatus): void => {
  const temporaryFile = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(status, null, 2)}\n`);
  fs.renameSync(temporaryFile, file);
};

export type ReadStatusResult =
  | { readonly type: 'running'; readonly status: SupervisorStatus }
  | { readonly type: 'stale'; readonly status: SupervisorStatus }
  | { readonly type: 'missing' };

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but belongs to another user.
    return error.code === 'EPERM';
  }
};

/** Reads the status file and reports whether the supervisor that wrote it is still running. */
export const readStatusFile = (file: string): ReadStatusResult => {
  if (!fs.existsSync(file)) {
    return { type: 'missing' };
  }
  const status: SupervisorStatus = JSON.parse(fs.readFileSync(file, 'utf8'));
  return isAlive(status.supervisorPid) ? { type: 'running', status } : { type: 'stale', status };
};
