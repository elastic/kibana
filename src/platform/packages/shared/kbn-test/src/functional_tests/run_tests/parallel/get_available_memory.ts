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

export function getAvailableMemory(): number {
  if (process.platform === 'linux') {
    try {
      const memInfo = Fs.readFileSync('/proc/meminfo', 'utf8');
      const match = memInfo.match(/^MemAvailable:\s+(\d+)\s+kB$/m);
      if (match) {
        const kb = Number(match[1]);
        if (Number.isFinite(kb)) {
          return Math.max(0, Math.floor(kb / 1024));
        }
      }
    } catch (err) {
      // fall through to fallback
    }
  }

  return Math.round(Os.freemem() / 1024 / 1024);
}
