/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs';
import Os from 'os';
import { execSync } from 'child_process';

export function getAvailableMemory(): number {
  if (process.platform === 'linux') {
    return getAvailableMemoryLinux();
  }

  if (process.platform === 'darwin') {
    return getAvailableMemoryDarwin();
  }

  return Math.round(Os.freemem() / 1024 / 1024);
}

function getAvailableMemoryLinux() {
  const memInfo = Fs.readFileSync('/proc/meminfo', 'utf8');
  const match = memInfo.match(/^MemAvailable:\s+(\d+)\s+kB$/m);
  const kb = Number(match![1]);
  return Math.max(0, Math.floor(kb / 1024));
}

function getAvailableMemoryDarwin() {
  const vmStat = execSync('vm_stat').toString();
  if (!vmStat) {
    throw new Error(`vm_stat not set`);
  }
  const pageSize = 4096; // usually 4 KiB
  const freePages = parseInt(vmStat.match(/Pages free:\s+(\d+)/)![1], 10);
  const inactivePages = parseInt(vmStat.match(/Pages inactive:\s+(\d+)/)![1], 10);
  return ((freePages + inactivePages) * pageSize) / 1024 / 1024;
}
